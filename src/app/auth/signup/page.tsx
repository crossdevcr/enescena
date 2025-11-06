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
  IconButton,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormHelperText,
  Stepper,
  Step,
  StepLabel
} from "@mui/material";
import { 
  Visibility, 
  VisibilityOff, 
  Email, 
  Lock, 
  Person,
  Business,
  MusicNote
} from "@mui/icons-material";
import NextLink from "next/link";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  userType: "ARTIST" | "VENUE" | "";
  acceptTerms: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  userType?: string;
  acceptTerms?: string;
  general?: string;
}

const steps = ["Account Type", "Account Details", "Verification"];

export default function SignUpPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    userType: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");

  const handleChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === "acceptTerms" ? event.target.checked : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.userType) {
      newErrors.userType = "Please select whether you are an Artist or Venue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter, lowercase letter, number, and special character";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep1()) return;
    if (activeStep === 1 && !validateStep2()) return;
    
    if (activeStep === 1) {
      handleSignUp();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setRegistrationEmail(formData.email);
        setActiveStep(2); // Move to verification step
      } else {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setErrors({ general: result.message || "Registration failed" });
        }
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmEmail = async () => {
    if (!confirmationCode) {
      setErrors({ general: "Please enter the confirmation code" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: registrationEmail,
          confirmationCode: confirmationCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push("/auth/signin?confirmed=true");
      } else {
        setErrors({ general: result.message || "Email confirmation failed" });
      }
    } catch (error) {
      console.error("Email confirmation error:", error);
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom textAlign="center">
              Join Enescena
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
              Are you an artist looking for gigs, or a venue seeking talent?
            </Typography>

            <FormControl component="fieldset" fullWidth error={!!errors.userType}>
              <FormLabel component="legend" sx={{ mb: 2 }}>
                I am a...
              </FormLabel>
              <RadioGroup
                value={formData.userType}
                onChange={handleChange("userType")}
              >
                <Card sx={{ mb: 2, border: formData.userType === "ARTIST" ? 2 : 1, borderColor: formData.userType === "ARTIST" ? "primary.main" : "grey.300" }}>
                  <CardContent sx={{ p: 2 }}>
                    <FormControlLabel 
                      value="ARTIST" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <MusicNote sx={{ mr: 1, color: "primary.main" }} />
                          <Box>
                            <Typography variant="h6">Artist</Typography>
                            <Typography variant="body2" color="text.secondary">
                              I'm a musician looking for venues and gigs
                            </Typography>
                          </Box>
                        </Box>
                      }
                      sx={{ m: 0, width: "100%" }}
                    />
                  </CardContent>
                </Card>

                <Card sx={{ mb: 2, border: formData.userType === "VENUE" ? 2 : 1, borderColor: formData.userType === "VENUE" ? "primary.main" : "grey.300" }}>
                  <CardContent sx={{ p: 2 }}>
                    <FormControlLabel 
                      value="VENUE" 
                      control={<Radio />} 
                      label={
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Business sx={{ mr: 1, color: "primary.main" }} />
                          <Box>
                            <Typography variant="h6">Venue</Typography>
                            <Typography variant="body2" color="text.secondary">
                              I represent a venue looking to book artists
                            </Typography>
                          </Box>
                        </Box>
                      }
                      sx={{ m: 0, width: "100%" }}
                    />
                  </CardContent>
                </Card>
              </RadioGroup>
              {errors.userType && (
                <FormHelperText>{errors.userType}</FormHelperText>
              )}
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom textAlign="center">
              Create Your Account
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              {formData.userType === "ARTIST" ? "Set up your artist profile" : "Set up your venue profile"}
            </Typography>

            {errors.general && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errors.general}
              </Alert>
            )}

            <TextField
              fullWidth
              label={formData.userType === "ARTIST" ? "Artist Name" : "Venue Name"}
              value={formData.name}
              onChange={handleChange("name")}
              error={!!errors.name}
              helperText={errors.name}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
            />

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
              autoComplete="new-password"
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

            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange("confirmPassword")}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              margin="normal"
              required
              autoComplete="new-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      aria-label="toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.acceptTerms}
                  onChange={handleChange("acceptTerms")}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  I agree to the{" "}
                  <Link component={NextLink} href="/terms" target="_blank" underline="hover">
                    Terms of Service
                  </Link>
                  {" "}and{" "}
                  <Link component={NextLink} href="/privacy" target="_blank" underline="hover">
                    Privacy Policy
                  </Link>
                </Typography>
              }
              sx={{ mt: 2 }}
            />
            {errors.acceptTerms && (
              <FormHelperText error>{errors.acceptTerms}</FormHelperText>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom textAlign="center">
              Verify Your Email
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
              We've sent a confirmation code to <strong>{registrationEmail}</strong>. 
              Please enter it below to complete your registration.
            </Typography>

            {errors.general && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errors.general}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Confirmation Code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              margin="normal"
              required
              placeholder="Enter 6-digit code"
              inputProps={{ maxLength: 6 }}
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleConfirmEmail}
              disabled={isLoading}
              sx={{ mt: 3 }}
            >
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Didn't receive the code?{" "}
                <Link href="#" underline="hover" onClick={(e) => {
                  e.preventDefault();
                  // TODO: Implement resend functionality
                }}>
                  Resend
                </Link>
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4
        }}
      >
        <Card sx={{ width: "100%", maxWidth: 600 }}>
          <CardContent sx={{ p: 4 }}>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {renderStepContent()}

            {activeStep < 2 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  {activeStep === 1 ? (isLoading ? "Creating Account..." : "Create Account") : "Next"}
                </Button>
              </Box>
            )}

            {activeStep === 0 && (
              <Box sx={{ textAlign: "center", mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{" "}
                  <Link component={NextLink} href="/auth/signin" underline="hover">
                    Sign in here
                  </Link>
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}