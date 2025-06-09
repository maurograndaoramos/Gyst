"""Embedding cache manager with hybrid storage and intelligent cache warming."""
import asyncio
import hashlib
import json
import logging
import sqlite3
import time
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from pathlib import Path
import threading

from .cache_strategies import CacheStrategy, create_cache_strategy

logger = logging.getLogger(__name__)

@dataclass
class CacheConfig:
    """Configuration for embedding cache manager."""
    # Cache strategy settings
    strategy_type: str = "hybrid"  # lru, ttl, hybrid
    max_memory_entries: int = 1000
    default_ttl_seconds: int = 86400  # 24 hours
    
    # Persistent storage settings
    use_persistent_storage: bool = True
    db_path: str = "embedding_cache.db"
    max_db_size_mb: int = 1000
    
    # Performance settings
    enable_preloading: bool = True
    preload_popular_embeddings: bool = True
    batch_size: int = 100
    compression_enabled: bool = True
    
    # Cache warming settings
    cache_warming_enabled: bool = True
    warm_cache_on_startup: bool = True
    popular_threshold_access_count: int = 5

@dataclass
class EmbeddingEntry:
    """Represents a cached embedding with metadata."""
    content_hash: str
    embedding: List[float]
    model_name: str
    content_preview: str
    token_count: int
    created_at: float
    last_accessed: float
    access_count: int = 0
    content_type: str = "text"
    chunk_index: Optional[int] = None
    document_path: Optional[str] = None

class EmbeddingCacheManager:
    """Manages embedding cache with memory and persistent storage."""
    
    def __init__(self, config: Optional[CacheConfig] = None):
        """Initialize embedding cache manager.
        
        Args:
            config: Cache configuration
        """
        self.config = config or CacheConfig()
        
        # Initialize memory cache strategy
        self.memory_cache = create_cache_strategy(
            strategy_type=self.config.strategy_type,
            max_size=self.config.max_memory_entries,
            default_ttl_seconds=self.config.default_ttl_seconds
        )
        
        # Initialize persistent storage
        self.db_path = Path(self.config.db_path)
        self.db_lock = threading.Lock()
        self._init_persistent_storage()
        
        # Performance tracking
        self.stats = {
            "memory_hits": 0,
            "db_hits": 0,
            "misses": 0,
            "cache_writes": 0,
            "cache_warming_events": 0
        }
        
        # Cache warming
        if self.config.warm_cache_on_startup:
            asyncio.create_task(self._warm_cache_startup())
        
        logger.info(f"Embedding cache manager initialized with {self.config.strategy_type} strategy")
    
    def _init_persistent_storage(self):
        """Initialize SQLite database for persistent storage."""
        if not self.config.use_persistent_storage:
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS embeddings (
                        content_hash TEXT PRIMARY KEY,
                        embedding BLOB NOT NULL,
                        model_name TEXT NOT NULL,
                        content_preview TEXT,
                        token_count INTEGER,
                        created_at REAL,
                        last_accessed REAL,
                        access_count INTEGER DEFAULT 0,
                        content_type TEXT DEFAULT 'text',
                        chunk_index INTEGER,
                        document_path TEXT
                    )
                ''')
                
                # Create indices for better performance
                conn.execute('CREATE INDEX IF NOT EXISTS idx_model_name ON embeddings(model_name)')
                conn.execute('CREATE INDEX IF NOT EXISTS idx_last_accessed ON embeddings(last_accessed)')
                conn.execute('CREATE INDEX IF NOT EXISTS idx_access_count ON embeddings(access_count)')
                conn.execute('CREATE INDEX IF NOT EXISTS idx_document_path ON embeddings(document_path)')
                
                conn.commit()
            
            logger.info(f"Initialized persistent embedding cache at {self.db_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize persistent storage: {e}")
            self.config.use_persistent_storage = False
    
    async def get_embedding(
        self, 
        content: str, 
        model_name: str,
        content_type: str = "text",
        chunk_index: Optional[int] = None,
        document_path: Optional[str] = None
    ) -> Optional[List[float]]:
        """Get embedding from cache.
        
        Args:
            content: Content to get embedding for
            model_name: Name of the embedding model
            content_type: Type of content (text, code, etc.)
            chunk_index: Index of chunk if this is a document chunk
            document_path: Path to source document
            
        Returns:
            Cached embedding or None if not found
        """
        cache_key = self._generate_cache_key(content, model_name)
        
        # Try memory cache first
        memory_result = self.memory_cache.get(cache_key)
        if memory_result is not None:
            self.stats["memory_hits"] += 1
            logger.debug(f"Memory cache hit for content hash: {cache_key[:8]}...")
            return memory_result.embedding
        
        # Try persistent storage
        if self.config.use_persistent_storage:
            db_result = await self._get_from_db(cache_key)
            if db_result is not None:
                self.stats["db_hits"] += 1
                logger.debug(f"Database cache hit for content hash: {cache_key[:8]}...")
                
                # Load into memory cache for faster future access
                self.memory_cache.put(cache_key, db_result)
                
                return db_result.embedding
        
        self.stats["misses"] += 1
        logger.debug(f"Cache miss for content hash: {cache_key[:8]}...")
        return None
    
    async def put_embedding(
        self, 
        content: str, 
        embedding: List[float], 
        model_name: str,
        token_count: int = 0,
        content_type: str = "text",
        chunk_index: Optional[int] = None,
        document_path: Optional[str] = None
    ) -> bool:
        """Store embedding in cache.
        
        Args:
            content: Content that was embedded
            embedding: The embedding vector
            model_name: Name of the embedding model
            token_count: Number of tokens in content
            content_type: Type of content
            chunk_index: Index of chunk if this is a document chunk
            document_path: Path to source document
            
        Returns:
            True if successfully cached
        """
        cache_key = self._generate_cache_key(content, model_name)
        current_time = time.time()
        
        # Create embedding entry
        entry = EmbeddingEntry(
            content_hash=cache_key,
            embedding=embedding,
            model_name=model_name,
            content_preview=content[:200],  # Store preview for debugging
            token_count=token_count,
            created_at=current_time,
            last_accessed=current_time,
            access_count=1,
            content_type=content_type,
            chunk_index=chunk_index,
            document_path=document_path
        )
        
        # Store in memory cache
        memory_success = self.memory_cache.put(cache_key, entry)
        
        # Store in persistent storage
        db_success = True
        if self.config.use_persistent_storage:
            db_success = await self._put_to_db(entry)
        
        if memory_success or db_success:
            self.stats["cache_writes"] += 1
            logger.debug(f"Cached embedding for content hash: {cache_key[:8]}...")
        
        return memory_success or db_success
    
    async def batch_get_embeddings(
        self, 
        contents_and_models: List[Tuple[str, str]],
        content_type: str = "text"
    ) -> Dict[str, Optional[List[float]]]:
        """Get multiple embeddings in batch.
        
        Args:
            contents_and_models: List of (content, model_name) tuples
            content_type: Type of content
            
        Returns:
            Dictionary mapping cache keys to embeddings (None if not cached)
        """
        results = {}
        
        # Generate cache keys
        cache_keys = [
            self._generate_cache_key(content, model_name)
            for content, model_name in contents_and_models
        ]
        
        # Batch check memory cache
        memory_results = {}
        for i, cache_key in enumerate(cache_keys):
            memory_result = self.memory_cache.get(cache_key)
            if memory_result is not None:
                memory_results[cache_key] = memory_result.embedding
                self.stats["memory_hits"] += 1
        
        # Batch check database for missing entries
        missing_keys = [key for key in cache_keys if key not in memory_results]
        db_results = {}
        
        if missing_keys and self.config.use_persistent_storage:
            db_results = await self._batch_get_from_db(missing_keys)
            self.stats["db_hits"] += len(db_results)
            
            # Load database results into memory cache
            for key, entry in db_results.items():
                self.memory_cache.put(key, entry)
        
        # Combine results
        for i, cache_key in enumerate(cache_keys):
            if cache_key in memory_results:
                results[cache_key] = memory_results[cache_key]
            elif cache_key in db_results:
                results[cache_key] = db_results[cache_key].embedding
            else:
                results[cache_key] = None
                self.stats["misses"] += 1
        
        return results
    
    async def batch_put_embeddings(
        self, 
        embeddings_data: List[Dict[str, Any]]
    ) -> int:
        """Store multiple embeddings in batch.
        
        Args:
            embeddings_data: List of dictionaries with embedding data
            
        Returns:
            Number of successfully cached embeddings
        """
        success_count = 0
        entries = []
        current_time = time.time()
        
        # Prepare entries
        for data in embeddings_data:
            cache_key = self._generate_cache_key(data["content"], data["model_name"])
            
            entry = EmbeddingEntry(
                content_hash=cache_key,
                embedding=data["embedding"],
                model_name=data["model_name"],
                content_preview=data["content"][:200],
                token_count=data.get("token_count", 0),
                created_at=current_time,
                last_accessed=current_time,
                access_count=1,
                content_type=data.get("content_type", "text"),
                chunk_index=data.get("chunk_index"),
                document_path=data.get("document_path")
            )
            entries.append(entry)
        
        # Batch store in memory
        for entry in entries:
            if self.memory_cache.put(entry.content_hash, entry):
                success_count += 1
        
        # Batch store in database
        if self.config.use_persistent_storage:
            db_success_count = await self._batch_put_to_db(entries)
            success_count = max(success_count, db_success_count)
        
        self.stats["cache_writes"] += success_count
        logger.info(f"Batch cached {success_count} embeddings")
        return success_count
    
    async def warm_cache_for_documents(self, document_paths: List[str]) -> int:
        """Warm cache for specific documents.
        
        Args:
            document_paths: List of document paths to warm cache for
            
        Returns:
            Number of embeddings loaded into memory cache
        """
        if not self.config.cache_warming_enabled or not self.config.use_persistent_storage:
            return 0
        
        warmed_count = 0
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                placeholders = ','.join('?' * len(document_paths))
                cursor = conn.execute(f'''
                    SELECT content_hash, embedding, model_name, content_preview, 
                           token_count, created_at, last_accessed, access_count,
                           content_type, chunk_index, document_path
                    FROM embeddings 
                    WHERE document_path IN ({placeholders})
                    ORDER BY access_count DESC, last_accessed DESC
                    LIMIT ?
                ''', document_paths + [self.config.max_memory_entries // 2])
                
                for row in cursor.fetchall():
                    entry = self._row_to_entry(row)
                    if self.memory_cache.put(entry.content_hash, entry):
                        warmed_count += 1
            
            self.stats["cache_warming_events"] += 1
            logger.info(f"Warmed cache with {warmed_count} embeddings for {len(document_paths)} documents")
            
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
        
        return warmed_count
    
    async def _warm_cache_startup(self):
        """Warm cache on startup with popular embeddings."""
        if not self.config.use_persistent_storage:
            return
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute('''
                    SELECT content_hash, embedding, model_name, content_preview, 
                           token_count, created_at, last_accessed, access_count,
                           content_type, chunk_index, document_path
                    FROM embeddings 
                    WHERE access_count >= ?
                    ORDER BY access_count DESC, last_accessed DESC
                    LIMIT ?
                ''', (self.config.popular_threshold_access_count, self.config.max_memory_entries // 3))
                
                warmed_count = 0
                for row in cursor.fetchall():
                    entry = self._row_to_entry(row)
                    if self.memory_cache.put(entry.content_hash, entry):
                        warmed_count += 1
                
                logger.info(f"Startup cache warming loaded {warmed_count} popular embeddings")
                
        except Exception as e:
            logger.error(f"Startup cache warming failed: {e}")
    
    def _generate_cache_key(self, content: str, model_name: str) -> str:
        """Generate cache key for content and model."""
        # Create a hash of content and model name for consistent caching
        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        model_hash = hashlib.md5(model_name.encode('utf-8')).hexdigest()[:8]
        return f"{model_hash}_{content_hash}"
    
    async def _get_from_db(self, cache_key: str) -> Optional[EmbeddingEntry]:
        """Get embedding entry from database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute('''
                    SELECT content_hash, embedding, model_name, content_preview, 
                           token_count, created_at, last_accessed, access_count,
                           content_type, chunk_index, document_path
                    FROM embeddings WHERE content_hash = ?
                ''', (cache_key,))
                
                row = cursor.fetchone()
                if row:
                    # Update access tracking
                    conn.execute('''
                        UPDATE embeddings 
                        SET last_accessed = ?, access_count = access_count + 1
                        WHERE content_hash = ?
                    ''', (time.time(), cache_key))
                    conn.commit()
                    
                    return self._row_to_entry(row)
                
        except Exception as e:
            logger.error(f"Database get failed: {e}")
        
        return None
    
    async def _batch_get_from_db(self, cache_keys: List[str]) -> Dict[str, EmbeddingEntry]:
        """Get multiple embedding entries from database."""
        results = {}
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                placeholders = ','.join('?' * len(cache_keys))
                cursor = conn.execute(f'''
                    SELECT content_hash, embedding, model_name, content_preview, 
                           token_count, created_at, last_accessed, access_count,
                           content_type, chunk_index, document_path
                    FROM embeddings WHERE content_hash IN ({placeholders})
                ''', cache_keys)
                
                # Update access tracking for found entries
                found_keys = []
                for row in cursor.fetchall():
                    entry = self._row_to_entry(row)
                    results[entry.content_hash] = entry
                    found_keys.append(entry.content_hash)
                
                if found_keys:
                    current_time = time.time()
                    for key in found_keys:
                        conn.execute('''
                            UPDATE embeddings 
                            SET last_accessed = ?, access_count = access_count + 1
                            WHERE content_hash = ?
                        ''', (current_time, key))
                    conn.commit()
                
        except Exception as e:
            logger.error(f"Database batch get failed: {e}")
        
        return results
    
    async def _put_to_db(self, entry: EmbeddingEntry) -> bool:
        """Store embedding entry in database."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Serialize embedding as JSON
                embedding_json = json.dumps(entry.embedding)
                
                conn.execute('''
                    INSERT OR REPLACE INTO embeddings 
                    (content_hash, embedding, model_name, content_preview, token_count,
                     created_at, last_accessed, access_count, content_type, chunk_index, document_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    entry.content_hash, embedding_json, entry.model_name, entry.content_preview,
                    entry.token_count, entry.created_at, entry.last_accessed, entry.access_count,
                    entry.content_type, entry.chunk_index, entry.document_path
                ))
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Database put failed: {e}")
            return False
    
    async def _batch_put_to_db(self, entries: List[EmbeddingEntry]) -> int:
        """Store multiple embedding entries in database."""
        success_count = 0
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                data = []
                for entry in entries:
                    embedding_json = json.dumps(entry.embedding)
                    data.append((
                        entry.content_hash, embedding_json, entry.model_name, entry.content_preview,
                        entry.token_count, entry.created_at, entry.last_accessed, entry.access_count,
                        entry.content_type, entry.chunk_index, entry.document_path
                    ))
                
                conn.executemany('''
                    INSERT OR REPLACE INTO embeddings 
                    (content_hash, embedding, model_name, content_preview, token_count,
                     created_at, last_accessed, access_count, content_type, chunk_index, document_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', data)
                conn.commit()
                success_count = len(entries)
                
        except Exception as e:
            logger.error(f"Database batch put failed: {e}")
        
        return success_count
    
    def _row_to_entry(self, row: Tuple) -> EmbeddingEntry:
        """Convert database row to EmbeddingEntry."""
        embedding = json.loads(row[1])  # Deserialize embedding
        
        return EmbeddingEntry(
            content_hash=row[0],
            embedding=embedding,
            model_name=row[2],
            content_preview=row[3],
            token_count=row[4],
            created_at=row[5],
            last_accessed=row[6],
            access_count=row[7],
            content_type=row[8] or "text",
            chunk_index=row[9],
            document_path=row[10]
        )
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        memory_stats = self.memory_cache.get_stats()
        
        db_stats = {"enabled": False}
        if self.config.use_persistent_storage:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    cursor = conn.execute('SELECT COUNT(*) FROM embeddings')
                    total_embeddings = cursor.fetchone()[0]
                    
                    cursor = conn.execute('SELECT SUM(LENGTH(embedding)) FROM embeddings')
                    total_size = cursor.fetchone()[0] or 0
                    
                    db_stats = {
                        "enabled": True,
                        "total_embeddings": total_embeddings,
                        "total_size_bytes": total_size,
                        "db_path": str(self.db_path)
                    }
            except Exception as e:
                logger.error(f"Failed to get database stats: {e}")
        
        return {
            "memory_cache": memory_stats,
            "persistent_storage": db_stats,
            "performance": self.stats,
            "configuration": {
                "strategy_type": self.config.strategy_type,
                "max_memory_entries": self.config.max_memory_entries,
                "ttl_seconds": self.config.default_ttl_seconds,
                "persistent_enabled": self.config.use_persistent_storage,
                "cache_warming_enabled": self.config.cache_warming_enabled
            }
        }
    
    async def cleanup_expired_entries(self) -> int:
        """Clean up expired entries from both memory and database."""
        cleanup_count = 0
        
        # Clean memory cache
        if hasattr(self.memory_cache, 'cleanup_expired'):
            memory_cleanup = self.memory_cache.cleanup_expired()
            cleanup_count += memory_cleanup
        
        # Clean database
        if self.config.use_persistent_storage:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    # Remove entries older than 30 days with low access count
                    cutoff_time = time.time() - (30 * 24 * 3600)  # 30 days
                    
                    cursor = conn.execute('''
                        DELETE FROM embeddings 
                        WHERE last_accessed < ? AND access_count < 3
                    ''', (cutoff_time,))
                    
                    db_cleanup = cursor.rowcount
                    conn.commit()
                    cleanup_count += db_cleanup
                    
                    if db_cleanup > 0:
                        logger.info(f"Cleaned up {db_cleanup} old database entries")
                        
            except Exception as e:
                logger.error(f"Database cleanup failed: {e}")
        
        return cleanup_count

# Global cache manager instance
_embedding_cache_manager: Optional[EmbeddingCacheManager] = None

def get_embedding_cache_manager(config: Optional[CacheConfig] = None) -> EmbeddingCacheManager:
    """Get or create the global embedding cache manager instance."""
    global _embedding_cache_manager
    if _embedding_cache_manager is None:
        _embedding_cache_manager = EmbeddingCacheManager(config)
    return _embedding_cache_manager
