/* eslint-disable @typescript-eslint/no-explicit-any */
/*
this chat section componet is is cover ~50% of screen with
use shadn component to complete the LLM chat section, it should have the following things
1. event handler for the manageing user input and that user can upload file pdfs , images , word  excel and csv document
2. when the user submits the response LLM will generate th response through an api, while the response is being generated give an option to  cancel the response generation , the response is being loaded the used can enter another message
3. the messages should be formatted through a markdown
4. all messages should have funtionality to copy , like , dislike and comment and the use licide-react
5. in every message there may be images , show the images at the bottom of the message, multiple images should be in a grid of 2x2 and the then in carousal, if you click on a image it should enlarge into a modal
6. use only shadcn components this is next js project , this is a client side component
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, FormEvent, ChangeEvent } from "react"
import { Paperclip, Send, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Import the ChatMessage component where markdown rendering and actions are handled.
import { ChatMessage } from "./chatSectionComponents/chat-message"

export interface Message {
  id: string
  text: string
  isUser: boolean
  images?: string[] // URLs of images to display
  files?: File[]   // Attached files for upload
  liked : boolean
  disliked : boolean
  comment : string
}

export default function ChatSection() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Automatically scroll to the bottom when new messages are added
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
//   }

//   useEffect(() => {
//     scrollToBottom()
//   }, [messages])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachedFiles(Array.from(event.target.files))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() && attachedFiles.length === 0) return

    // Create image URLs for preview right away
    const imagePreviews = attachedFiles.map(file => URL.createObjectURL(file))

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      images: imagePreviews,
      files: attachedFiles, // You would use this to upload the actual files
      liked : false,
      disliked : false,
      comment : ""
    }
    setMessages(prev => [...prev, userMessage])

    // Reset inputs
    setInput("")
    setAttachedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Clear the file input
    }

    setIsGenerating(true)
    abortControllerRef.current = new AbortController()

    try {
      // In a real app, you would send `userMessage` (text and files) to your API here.
      // The code below simulates a streaming API response.
      const llmMessageId = (Date.now() + 1).toString()
      const initialLlmMessage: Message = {
        id: llmMessageId,
        text: "",
        isUser: false,
        liked : false,
        disliked : false,
        comment : "",
        // Example images for demonstration
        images: ["https://picsum.photos/seed/1/300/300", "https://picsum.photos/seed/2/300/300", "https://picsum.photos/seed/3/300/300", "https://picsum.photos/seed/4/300/300", "https://picsum.photos/seed/5/300/300"],
      }
      setMessages(prev => [...prev, initialLlmMessage])

      // MOCK API STREAM
      const fullResponse = `**This is a streamed response from the LLM.** \n\n # Hello All`;
      const words = fullResponse.split(" ")

      for (const word of words) {
        if (abortControllerRef.current.signal.aborted) {
          throw new DOMException("Aborted", "AbortError")
        }
        await new Promise(resolve => setTimeout(resolve, 50)) // Simulate network delay
        setMessages(prev =>
          prev.map(msg =>
            msg.id === llmMessageId ? { ...msg, text: msg.text + word + " " } : msg
          )
        )
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Response generation cancelled.")
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messages[messages.length - 1].id
              ? { ...msg, text: `${msg.text}\n\n-- Generation Cancelled --` }
              : msg
          )
        )
      } else {
        console.error("Error generating response:", error)
         setMessages(prev =>
          prev.map(msg =>
            msg.id === messages[messages.length - 1].id
              ? { ...msg, text: `${msg.text}\n\n-- Error Generating Response --` }
              : msg
          )
        )
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  return (
    // This makes the layout robust.
    <div className="flex flex-col w-full max-w-4xl mx-auto bg-background h-full max-h-full rounded-lg border">

      <ScrollArea className="flex-1 overflow-y-scroll p-4">
        <div className="space-y-6">
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} onCommentSubmit={()=>{console.log("Comment Registered")}} />
          ))}
          {/* **MAIN FIX**: Add a ref here to enable scrolling to the bottom */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* This input form will now stick to the bottom */}
      <div className="sticky bottom-0 p-4 border-t bg-background z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach Files ({attachedFiles.length})</p>
              </TooltipContent>
            </Tooltip>
          
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={attachedFiles.length > 0 ? `${attachedFiles.length} file(s) attached` : "Type your message..."}
            className="flex-grow"
          />
          <Tooltip>
            <TooltipTrigger asChild>
          {isGenerating?(
            <Button onClick={handleCancel}>
                <XCircle className="h-5 w-5" />
            </Button>
          ):(
            <Button type="submit" disabled={isGenerating && !input.trim() && attachedFiles.length === 0}>
             <Send className="h-5 w-5" />
          </Button>
          )}
          </TooltipTrigger>
          <TooltipContent>
          <p>{isGenerating? "Cancel Message" : "Send Message"}</p>
          </TooltipContent>
          </Tooltip>
          </TooltipProvider>
          
        </form>
      </div>
    </div>
  )
}