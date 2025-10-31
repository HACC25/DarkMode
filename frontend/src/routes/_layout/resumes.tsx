import { Box, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useRef, useState } from "react"

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
            <Box
              key={resume.id}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              borderWidth="1px"
              borderRadius="md"
              p={3}
            >
              <Text>
                Uploaded on {new Date(resume.created_at).toLocaleString()}
              </Text>
              <Button
                type="button"
                variant="outline"
                onClick={() => deleteMutation.mutate(resume.id)}
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Stack>
  )
}
