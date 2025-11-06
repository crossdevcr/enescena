"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  InputAdornment,
  IconButton
} from "@mui/material";
import { Visibility, VisibilityOff, Email, Lock } from "@mui/icons-material";
import NextLink from "next/link";

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to dashboard based on user role
        if (result.user?.role === "VENUE") {
          router.push("/dashboard/venue");
        } else {
          router.push("/dashboard/artist");
        }
        router.refresh(); // Refresh to update auth state
      } else {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setErrors({ general: result.message || "Sign in failed" });
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #F9FAFB 0%, #E5E7EB 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        px: 2
      }}
    >
      <Card 
        sx={{ 
          width: "100%", 
          maxWidth: 400,
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          border: "1px solid",
          borderColor: "grey.200"
        }}
      >
          <CardContent sx={{ p: 5 }}>
            {/* Brand Header */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Typography
                variant="h3"
                component="h1"
                sx={{ 
                  fontWeight: 700,
                  color: "text.primary",
                  mb: 1,
                  letterSpacing: "-0.025em"
                }}
              >
                Enescena
              </Typography>
              <Box 
                sx={{ 
                  width: 40, 
                  height: 3, 
                  backgroundColor: "primary.main", 
                  mx: "auto", 
                  mb: 3,
                  borderRadius: 1.5
                }} 
              />
            </Box>

            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              textAlign="center"
              sx={{ 
                mb: 2,
                fontWeight: 600,
                color: "text.primary"
              }}
            >
              Welcome Back
            </Typography>
            
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{ mb: 4 }}
            >
              Sign in to continue to your dashboard
            </Typography>

            {errors.general && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errors.general}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange("email")}
                error={!!errors.email}
                helperText={errors.email}
                margin="normal"
                required
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange("password")}
                error={!!errors.password}
                helperText={errors.password}
                margin="normal"
                required
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{ 
                  mt: 4, 
                  mb: 3,
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
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </Box>

            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{" "}
                <Link component={NextLink} href="/auth/signup" underline="hover">
                  Sign up here
                </Link>
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Link 
                component={NextLink} 
                href="/auth/forgot-password" 
                underline="hover"
                variant="body2"
                color="text.secondary"
              >
                Forgot your password?
              </Link>
            </Box>
          </CardContent>
        </Card>
    </Box>
  );
}