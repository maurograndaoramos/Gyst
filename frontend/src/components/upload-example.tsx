"use client"

import React from 'react'
import FileValidator from '@/components/FileValidator' // Import the new component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const UploadExample: React.FC = () => {
  return (
    <Card className="w-full max-w-3xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Advanced File Upload & Validation</CardTitle>
        <CardDescription>
          Drag and drop files or click to select. Files will be validated client-side before any upload attempt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileValidator />
      </CardContent>
    </Card>
  )
}

export default UploadExample
