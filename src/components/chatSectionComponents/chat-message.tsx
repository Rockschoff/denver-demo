/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Copy, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"
import { marked } from "marked"
import DOMPurify from "dompurify"
import { useState, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import type { Message } from "../chat-section"



interface ChatMessageProps {
  message: Message
  onCommentSubmit: (comment: string) => void
}

export function ChatMessage({ message, onCommentSubmit }: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [comment, setComment] = useState("")

  // Convert markdown → sanitized HTML
  const html = useMemo(() => {
    const raw = marked.parse(message.text || "") as string
    return DOMPurify.sanitize(raw)
  }, [message.text])

  const handleCommentSubmit = () => {
    if (!comment.trim()) return
    onCommentSubmit(comment)
    setIsCommentModalOpen(false)
    setComment("")
  }

  return (
    <div
      className={`group flex items-start gap-3 w-full ${message.isUser ? "justify-end" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!message.isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder-ai.jpg" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      <div className={`flex flex-col gap-1 items-${message.isUser ? "end" : "start"} max-w-xl w-[85%]`}>
        <Card className={`w-full ${message.isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          <CardContent className="p-3 text-sm">
            {/* Render the sanitized HTML */}
            <div
              className="prose prose-sm break-words"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            {message.images?.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {message.images.map((src, i) => (
                  <Dialog key={i}>
                    <DialogTrigger asChild>
                      <img
                        src={src}
                        alt={`Attachment ${i + 1}`}
                        className="rounded-lg w-full cursor-pointer aspect-video object-cover hover:scale-105 transition-transform"
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <img
                        src={src}
                        alt={`Attachment ${i + 1}`}
                        className="max-h-[80vh] w-auto mx-auto rounded-lg"
                      />
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* action buttons on hover */}
        { (
          <div className="flex gap-1 p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(message.text)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <ThumbsUp className={`h-4 w-4 ${message.liked?"text-blue-600" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Like</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <ThumbsDown className={`h-4 w-4 ${message.disliked?"text-blue-600" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dislike</TooltipContent>
              </Tooltip>
              <Dialog open={isCommentModalOpen} onOpenChange={setIsCommentModalOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MessageSquare className={`h-4 w-4 ${message.comment.length>0?"text-blue-600" : ""}`} />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Comment</TooltipContent>
                </Tooltip>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Provide additional feedback</DialogTitle>
                    <DialogDescription>Your feedback is valuable to us.</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    className="min-h-[120px] my-2"
                    placeholder="Type your comment..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <DialogFooter>
                    <Button onClick={handleCommentSubmit}>Submit</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TooltipProvider>
          </div>
        )}
      </div>
      {message.isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback>You</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
