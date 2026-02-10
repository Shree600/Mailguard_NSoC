/**
 * EMAIL TABLE COMPONENT
 * Modern table displaying emails with predictions
 * Supports multi-select for bulk operations
 */

import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Trash2, 
  ThumbsUp, 
  AlertTriangle, 
  Inbox,
  ArrowUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function EmailTable({ 
  emails, 
  onDelete, 
  onFeedback, 
  loading, 
  selectedEmails, 
  onSelectEmail, 
  onSelectAll 
}) {
  // Show loading state
  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <Skeleton className="h-6 w-32 bg-slate-700" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4 rounded bg-slate-700" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-slate-700" />
                <Skeleton className="h-3 w-1/2 bg-slate-700" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full bg-slate-700" />
              <Skeleton className="h-4 w-12 bg-slate-700" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded bg-slate-700" />
                <Skeleton className="h-8 w-8 rounded bg-slate-700" />
                <Skeleton className="h-8 w-8 rounded bg-slate-700" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Show empty state
  if (!emails || emails.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Email List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-full mb-4">
              <Inbox className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">No emails yet</h3>
            <p className="text-slate-400 mb-6">
              Connect your email account to start detecting phishing emails
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render email table
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-100">Email List</CardTitle>
          {selectedEmails.length > 0 && (
            <span className="text-sm text-slate-400">
              {selectedEmails.length} email{selectedEmails.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-900 sticky top-0 z-10 border-b border-slate-700">
              <TableRow className="hover:bg-slate-900">
                <TableHead className="w-12 text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedEmails.length === emails.length && emails.length > 0}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    title="Select all emails"
                  />
                </TableHead>
                <TableHead className="min-w-[300px] text-slate-300 font-semibold">
                  Subject
                </TableHead>
                <TableHead className="min-w-[200px] text-slate-300 font-semibold">From</TableHead>
                <TableHead className="w-32 text-slate-300 font-semibold">Status</TableHead>
                <TableHead className="w-28 text-slate-300 font-semibold">Confidence</TableHead>
                <TableHead className="w-32 text-right text-slate-300 font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emails.map((email) => (
                <EmailRow
                  key={email._id}
                  email={email}
                  onDelete={onDelete}
                  onFeedback={onFeedback}
                  isSelected={selectedEmails.includes(email._id)}
                  onSelect={onSelectEmail}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// Individual Email Row Component
function EmailRow({ email, onDelete, onFeedback, isSelected, onSelect }) {
  // Get prediction badge variant
  const getPredictionBadge = () => {
    const prediction = email.prediction?.toLowerCase() || 'unknown'
    
    if (prediction === 'phishing') {
      return <Badge variant="danger">🚨 Phishing</Badge>
    } else if (prediction === 'safe' || prediction === 'legitimate') {
      return <Badge variant="success">✅ Safe</Badge>
    } else if (prediction === 'pending') {
      return <Badge variant="warning">⏳ Pending</Badge>
    } else {
      return <Badge variant="secondary">❓ Unknown</Badge>
    }
  }

  // Format confidence percentage
  const getConfidence = () => {
    const confidence = email.confidence || 0
    return `${(confidence * 100).toFixed(1)}%`
  }

  // Truncate long text
  const truncate = (text, length = 50) => {
    if (!text) return 'N/A'
    return text.length > length ? text.substring(0, length) + '...' : text
  }

  return (
    <TableRow className={`transition-colors border-b border-slate-700 hover:bg-slate-700/50 ${isSelected ? 'bg-blue-500/10' : ''}`}>
      {/* Checkbox Column */}
      <TableCell>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onSelect(email._id)
          }}
          className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
        />
      </TableCell>
      
      {/* Subject Column */}
      <TableCell>
        <div className="text-sm font-medium text-slate-100">
          {truncate(email.subject)}
        </div>
      </TableCell>
      
      {/* From Column */}
      <TableCell>
        <div className="text-sm text-slate-400">
          {truncate(email.sender || email.from, 30)}
        </div>
      </TableCell>
      
      {/* Status/Prediction Column */}
      <TableCell>
        {getPredictionBadge()}
      </TableCell>
      
      {/* Confidence Column */}
      <TableCell>
        <div className="text-sm text-slate-100 font-medium">
          {getConfidence()}
        </div>
      </TableCell>
      
      {/* Actions Column */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Feedback: Correct */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFeedback(email._id, 'correct')}
            className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            title="Mark as Correct"
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          
          {/* Feedback: Wrong */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFeedback(email._id, 'wrong')}
            className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            title="Mark as Wrong"
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
          
          {/* Delete Button - Only show for phishing emails */}
          {email.prediction?.toLowerCase() === 'phishing' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(email._id)}
              className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
              title="Delete Email"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export default EmailTable
