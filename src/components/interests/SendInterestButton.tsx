'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface SendInterestButtonProps {
  receiverProfileId: string
  onInterestSent?: () => void
}

export function SendInterestButton({ receiverProfileId, onInterestSent }: SendInterestButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [message, setMessage] = useState('')

  const handleSendInterest = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/interests/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_profile_id: receiverProfileId,
          message: message.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send interest')
        return
      }

      toast.success('Interest sent successfully!')
      setShowDialog(false)
      setMessage('')
      onInterestSent?.()
    } catch (error) {
      console.error('Error sending interest:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
      >
        <Heart className="mr-2 h-4 w-4" />
        Send Interest
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Interest</DialogTitle>
            <DialogDescription>
              Express your interest in this profile. You can optionally include a message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Write a brief introduction message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-slate-500">
                {message.length}/500 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInterest}
              disabled={isLoading}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  Send Interest
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
