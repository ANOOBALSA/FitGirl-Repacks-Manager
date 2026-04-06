"use client";

import React, { useState } from "react";
import {
  Modal,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Title,
  Text,
  Anchor,
  Alert,
  Group,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconMailCheck } from "@tabler/icons-react";
import { useAuth } from "../providers/AuthProvider";

interface AuthModalProps {
  opened: boolean;
  onClose: () => void;
}

export function AuthModal({ opened, onClose }: AuthModalProps) {
  const [type, setType] = useState<
    "login" | "signup" | "forgot-password" | "update-password"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const {
    login,
    signup,
    resetPassword,
    updatePassword,
    isPasswordRecovery,
    setIsPasswordRecovery,
  } = useAuth();

  React.useEffect(() => {
    if (isPasswordRecovery) {
      setType("update-password");
    }
  }, [isPasswordRecovery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (type === "login") {
        await login(email, password);
        onClose();
      } else if (type === "signup") {
        const data = await signup(name, email, password);

        if (data?.user?.identities?.length === 0) {
          setError(
            "An account with this email already exists. Please login instead.",
          );
        } else {
          setIsSignedUp(true);
        }
      } else if (type === "forgot-password") {
        await resetPassword(email);
        setResetSent(true);
      } else if (type === "update-password") {
        await updatePassword(password);
        onClose();
        notifications.show({
          title: "Password Updated",
          message: "Your password has been changed successfully.",
          color: "teal",
        });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  if (isSignedUp) {
    return (
      <Modal
        opened={opened}
        onClose={() => {
          setIsSignedUp(false);
          onClose();
        }}
        title={<Title order={4}>Verify Email</Title>}
        centered
        radius="md"
      >
        <Stack align="center" gap="md" py="xl">
          <IconMailCheck size={64} color="var(--mantine-color-teal-6)" />
          <Title order={3} ta="center">
            Account Created!
          </Title>
          <Text ta="center" c="dimmed" size="sm">
            We've sent a confirmation link to{" "}
            <Text span fw={700} c="white">
              {email}
            </Text>
            . Please verify your email to activate your account and start
            syncing your library.
          </Text>
          <Button
            fullWidth
            onClick={() => {
              setIsSignedUp(false);
              setType("login");
            }}
            variant="light"
            color="blue"
            mt="md"
          >
            Back to Login
          </Button>
        </Stack>
      </Modal>
    );
  }

  if (resetSent) {
    return (
      <Modal
        opened={opened}
        onClose={() => {
          setResetSent(false);
          onClose();
        }}
        title={<Title order={4}>Reset Password</Title>}
        centered
        radius="md"
      >
        <Stack align="center" gap="md" py="xl">
          <IconMailCheck size={64} color="var(--mantine-color-teal-6)" />
          <Title order={3} ta="center">
            Email Sent!
          </Title>
          <Text ta="center" c="dimmed" size="sm">
            We've sent a password reset link to{" "}
            <Text span fw={700} c="white">
              {email}
            </Text>
            . Please check your inbox to continue.
          </Text>
          <Button
            fullWidth
            onClick={() => {
              setResetSent(false);
              setType("login");
            }}
            variant="light"
            color="blue"
            mt="md"
          >
            Back to Login
          </Button>
        </Stack>
      </Modal>
    );
  }

  const getTitle = () => {
    switch (type) {
      case "login":
        return "Login";
      case "signup":
        return "Create Account";
      case "forgot-password":
        return "Reset Password";
      case "update-password":
        return "Update Password";
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setIsPasswordRecovery(false);
        onClose();
      }}
      title={<Title order={4}>{getTitle()}</Title>}
      centered
      radius="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Error"
              color="red"
            >
              {error}
            </Alert>
          )}

          {type === "signup" && (
            <TextInput
              label="Name"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          )}

          {type !== "update-password" && (
            <TextInput
              label="Email"
              placeholder="hello@example.com"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          )}

          {(type === "login" ||
            type === "signup" ||
            type === "update-password") && (
            <PasswordInput
              label={type === "update-password" ? "New Password" : "Password"}
              placeholder={
                type === "update-password"
                  ? "Your new password"
                  : "Your password"
              }
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          )}

          {type === "login" && (
            <Group justify="flex-end" mt="-xs">
              <Anchor
                component="button"
                type="button"
                size="xs"
                onClick={() => setType("forgot-password")}
              >
                Forgot password?
              </Anchor>
            </Group>
          )}

          <Button type="submit" loading={loading} fullWidth mt="md">
            {type === "login"
              ? "Login"
              : type === "signup"
                ? "Sign Up"
                : type === "forgot-password"
                  ? "Send Reset Link"
                  : "Update Password"}
          </Button>

          {type !== "update-password" && (
            <Text size="sm" ta="center" mt="sm">
              {type === "login"
                ? "Don't have an account? "
                : type === "signup"
                  ? "Already have an account? "
                  : ""}
              <Anchor
                component="button"
                type="button"
                fw={700}
                onClick={() => {
                  if (type === "forgot-password") setType("login");
                  else setType(type === "login" ? "signup" : "login");
                }}
              >
                {type === "login" ? "Create Account" : "Login"}
              </Anchor>
            </Text>
          )}
        </Stack>
      </form>
    </Modal>
  );
}
