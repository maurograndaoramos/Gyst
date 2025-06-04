'use client';

import React from 'react';
import { CustomTableProps } from './types';

export function CustomTable({ children, className }: CustomTableProps) {
  return (
    <div className={`my-6 overflow-x-auto ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            {children}
          </table>
        </div>
      </div>
    </div>
  );
}

export function CustomTableHead({ children, ...props }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800">
      {children}
    </thead>
  );
}

export function CustomTableBody({ children, ...props }: { children: React.ReactNode }) {
  return (
    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
      {children}
    </tbody>
  );
}

export function CustomTableRow({ children, ...props }: { children: React.ReactNode }) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {children}
    </tr>
  );
}

export function CustomTableHeaderCell({ children, ...props }: { children: React.ReactNode }) {
  return (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
      {...props}
    >
      {children}
    </th>
  );
}

export function CustomTableCell({ children, ...props }: { children: React.ReactNode }) {
  return (
    <td 
      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
      {...props}
    >
      {children}
    </td>
  );
}
