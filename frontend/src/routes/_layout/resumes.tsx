import { Box, Flex, Heading, Icon, Input, Stack, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { ChevronDown } from "lucide-react"
import { useRef, useState } from "react"

import type { ResumeRead } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import useAuth from "@/hooks/useAuth"
import {
  useDeleteResumeMutation,
  useResumesQuery,
  useUploadResumeMutation,
} from "@/queries/resumes"

export const Route = createFileRoute("/_layout/resumes")({
  component: ResumesPage,
})

function ResumesPage() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { data: resumes, isLoading } = useResumesQuery({
    enabled: user?.role === "APPLICANT",
  })
  const uploadMutation = useUploadResumeMutation({
    onSuccess: () => {
      showSuccessToast("Resume uploaded.")
    },
    onError: () => {
      showErrorToast("Could not upload resume.")
    },
  })
  const deleteMutation = useDeleteResumeMutation({
    onSuccess: () => {
      showSuccessToast("Resume deleted.")
    },
    onError: () => {
      showErrorToast("Could not delete resume.")
    },
  })

  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (user?.role !== "APPLICANT") {
    return (
      <Stack gap={4}>
        <Heading size="lg">Resumes</Heading>
        <Text>This section is only available to applicants.</Text>
      </Stack>
    )
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }
    const file = files[0]
    uploadMutation.mutate({
      file,
    })
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    if (!isDragging) {
      setIsDragging(true)
    }
  }

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setIsDragging(false)
  }

  return (
    <Stack gap={6}>
      <Heading size="lg">Resumes</Heading>

      <Box
        borderWidth="2px"
        borderStyle="dashed"
        borderRadius="md"
        p={6}
        textAlign="center"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <Stack gap={3}>
          <Text>
            {isDragging
              ? "Release to upload your resume"
              : "Drag and drop a resume file here"}
          </Text>
          <Text>or</Text>
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            loading={uploadMutation.isPending}
          >
            Choose a file
          </Button>
          <Input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            display="none"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </Stack>
      </Box>

      <Stack gap={4}>
        <Heading size="md">Your resumes</Heading>
        {isLoading && <Text>Loading resumes...</Text>}
        {!isLoading && (resumes ?? []).length === 0 && (
          <Text>No resumes uploaded yet.</Text>
        )}
        <Stack gap={3}>
          {(resumes ?? []).map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              onDelete={() => deleteMutation.mutate(resume.id)}
              isDeleting={
                deleteMutation.isPending && deleteMutation.variables === resume.id
              }
            />
          ))}
        </Stack>
      </Stack>
    </Stack>
  )
}

type ResumeCardProps = {
  resume: ResumeRead
  onDelete: () => void
  isDeleting: boolean
}

function ResumeCard({ resume, onDelete, isDeleting }: ResumeCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasTextContent = Boolean(resume.text_content?.trim())
  const uploadedLabel = new Date(resume.created_at).toLocaleString()

  return (
    <Box borderWidth="1px" borderRadius="md" p={3}>
      <Stack gap={3}>
        <Flex
          align={{ base: "flex-start", md: "center" }}
          justify="space-between"
          flexDirection={{ base: "column", md: "row" }}
          gap={3}
          flexWrap="wrap"
        >
          <Text>Uploaded on {uploadedLabel}</Text>
          <Stack direction="row" gap={2} flexWrap="wrap" justify="flex-end">
            {hasTextContent && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen((previous) => !previous)}
                aria-expanded={isOpen}
              >
                {isOpen ? "Hide text content" : "View text content"}
                <Icon
                  as={ChevronDown}
                  transition="transform 0.2s ease"
                  transform={isOpen ? "rotate(180deg)" : undefined}
                />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              loading={isDeleting}
            >
              Delete
            </Button>
          </Stack>
        </Flex>
        {hasTextContent && isOpen && (
          <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50" _dark={{ bg: "gray.900" }}>
            <Text whiteSpace="pre-wrap">{resume.text_content}</Text>
          </Box>
        )}
        {!hasTextContent && (
          <Text color="gray.500" fontSize="sm">
            Text preview is not available for this resume.
          </Text>
        )}
      </Stack>
    </Box>
  )
}
