import { Box, Container, Typography } from "@mui/material";
export default function Page() {
  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
        <Typography variant="h5" fontWeight={700}>Coming soon…</Typography>
      </Container>
    </Box>
  );
}