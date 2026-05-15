"use client";

import { useState } from "react";
import {
  Modal,
  Title,
  Text,
  Textarea,
  Button,
  Group,
  Stack,
  Rating,
  Select,
  ActionIcon,
  rem,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMessageHeart, IconSend, IconBug, IconSparkles, IconMessage } from "@tabler/icons-react";
import { pb } from "../lib/pocketbase";
import { useAuth } from "./providers/AuthProvider";

interface FeedbackModalProps {
  opened: boolean;
  onClose: () => void;
}

export function FeedbackModal({ opened, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [type, setType] = useState<string>("suggestion");
  const [content, setContent] = useState("");

  const handleSubmit = async () => {
    if (!content.trim()) {
      notifications.show({
        title: "Missing Content",
        message: "Please tell us what's on your mind before sending.",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      await pb.collection("feedbacks").create({
        content,
        rating,
        type,
        user: user?.id || null,
        user_email: user?.email || "anonymous",
        version: "1.1.0", // Hardcoded for now as seen in package.json
        platform: "windows",
        timestamp: new Date().toISOString(),
      });

      notifications.show({
        title: "Feedback Sent!",
        message: "Thank you for helping us improve FitGirl Repacks Manager.",
        color: "teal",
        icon: <IconMessageHeart size={18} />,
      });
      
      setContent("");
      setRating(5);
      setType("suggestion");
      onClose();
    } catch (error: any) {
      console.error("Feedback submission error:", error);
      notifications.show({
        title: "Submission Failed",
        message: error.message || "Something went wrong. Please try again later.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconMessageHeart size={24} color="var(--mantine-color-pink-filled)" />
          <Title order={3}>Share Your Thoughts</Title>
        </Group>
      }
      size="md"
      radius="xl"
      centered
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      styles={{
        content: {
          background: "rgba(25, 26, 30, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
        header: {
          background: "transparent",
        }
      }}
    >
      <Stack gap="lg" p="sm">
        <Text size="sm" c="dimmed">
          Your feedback helps us make this manager better for everyone. Whether it's a bug, a feature request, or just some love, we want to hear it!
        </Text>

        <Group grow>
          <Select
            label="Feedback Type"
            placeholder="What kind of feedback?"
            data={[
              { value: "bug", label: "Bug Report" },
              { value: "suggestion", label: "Feature Suggestion" },
              { value: "praise", label: "Praise / Love" },
              { value: "other", label: "Other" },
            ]}
            value={type}
            onChange={(val) => setType(val || "suggestion")}
            radius="md"
            leftSection={
              type === "bug" ? <IconBug size={16} /> : 
              type === "suggestion" ? <IconSparkles size={16} /> : 
              <IconMessage size={16} />
            }
          />
          
          <Stack gap={4}>
            <Text size="sm" fw={500}>Rating</Text>
            <Rating 
              value={rating} 
              onChange={setRating} 
              size="lg" 
              color="pink" 
            />
          </Stack>
        </Group>

        <Textarea
          label="Your Message"
          placeholder="I wish the app could..."
          minRows={4}
          maxRows={8}
          autosize
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
          radius="md"
          required
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="gray" onClick={onClose} radius="md">
            Cancel
          </Button>
          <Button
            leftSection={<IconSend size={18} />}
            onClick={handleSubmit}
            loading={loading}
            radius="md"
            variant="gradient"
            gradient={{ from: "pink", to: "grape" }}
          >
            Send Feedback
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
