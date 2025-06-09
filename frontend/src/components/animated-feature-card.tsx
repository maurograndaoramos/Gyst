"use client"
import { motion } from "framer-motion"
import { ReactNode } from "react"

interface AnimatedFeatureCardProps {
  icon: ReactNode
  title: string
  description: string
  delay?: number
}

export function AnimatedFeatureCard({ icon, title, description, delay = 0 }: AnimatedFeatureCardProps) {
  return (
    <motion.div
      className="bg-white border-2 border-purple-100 rounded-2xl p-8 flex flex-col items-center text-center shadow-lg group cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      whileHover={{ 
        y: -5,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        borderColor: "rgb(196 181 253)"
      }}
    >
      <motion.div 
        className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors duration-300"
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div 
          className="text-purple-600"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.2 }}
          viewport={{ once: true }}
        >
          {icon}
        </motion.div>
      </motion.div>
      
      <motion.h3 
        className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-purple-600 transition-colors duration-300"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: delay + 0.3 }}
        viewport={{ once: true }}
      >
        {title}
      </motion.h3>
      
      <motion.p 
        className="text-gray-600 leading-relaxed"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: delay + 0.4 }}
        viewport={{ once: true }}
      >
        {description}
      </motion.p>
    </motion.div>
  )
}