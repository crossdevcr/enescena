"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  Link,
  Container,
  CircularProgress
} from "@mui/material";
import { CheckCircle, Email } from "@mui/icons-material";
import NextLink from "next/link";

function ConfirmEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmationCode.trim()) {
      setError("Please enter the confirmation code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          confirmationCode: confirmationCode.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsConfirmed(true);
        // Redirect to sign in page after 3 seconds
        setTimeout(() => {
          router.push("/auth/signin?confirmed=true");
        }, 3000);
      } else {
        setError(result.message || "Email confirmation failed");
      }
    } catch (error) {
      console.error("Email confirmation error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        setError(""); // Clear any previous errors
        // You might want to show a success message here
        alert("Confirmation code resent successfully!");
      } else {
        setError(result.message || "Failed to resend confirmation code");
      }
    } catch (error) {
      console.error("Resend confirmation error:", error);
      setError("Failed to resend confirmation code");
    } finally {
      setIsLoading(false);
    }
  };

  if (isConfirmed) {
    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 400 }}>
            <CardContent sx={{ p: 4, textAlign: "center" }}>
              <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
              <Typography variant="h5" component="h1" gutterBottom>
                Email Confirmed!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your email has been successfully verified. You can now sign in to your account.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Redirecting to sign in page...
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Email sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
              <Typography variant="h5" component="h1" gutterBottom>
                Confirm Your Email
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We&apos;ve sent a confirmation code to
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ mt: 1 }}>
                {email}
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleConfirmEmail}>
              <TextField
                fullWidth
                label="Confirmation Code"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                margin="normal"
                required
                autoFocus
                inputProps={{ 
                  maxLength: 6,
                  style: { textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.5rem" }
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ 
                  mb: 2,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: "1rem",
                  backgroundColor: "primary.main",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 20px rgba(220, 38, 38, 0.3)"
                  },
                  "&:disabled": {
                    backgroundColor: "grey.300"
                  }
                }}
              >
                {isLoading ? "Verifying..." : "Confirm Email"}
              </Button>
            </form>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Didn&apos;t receive the code?
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={handleResendCode}
                disabled={isLoading}
              >
                Resend Code
              </Button>
            </Box>

            <Box sx={{ textAlign: "center", mt: 3, pt: 3, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="body2" color="text.secondary">
                <Link component={NextLink} href="/auth/signin" underline="hover">
                  ← Back to Sign In
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </Container>
    }>
      <ConfirmEmailForm />
    </Suspense>
  );
}