import { useState } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Card, 
  CardContent,
  CircularProgress
} from '@mui/material';
import { generateCaptions } from '../services/api';

export const CaptionGenerator = () => {
  const [file, setFile] = useState<File | null>(null);
  const [handle, setHandle] = useState('');
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [captions, setCaptions] = useState<{
    shortCaption: string;
    mediumCaption: string;
    longCaption: string;
  } | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !handle) {
      setError('Please select a file and enter an Instagram handle');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await generateCaptions(file, handle);
      setCaptions(response.captions);
    } catch (err) {
      setError('Failed to generate captions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Instagram Caption Generator
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            component="label"
            fullWidth
            sx={{ mb: 2 }}
          >
            Upload Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleFileChange}
            />
          </Button>

          {preview && (
            <Box sx={{ mb: 2 }}>
              <img 
                src={preview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px',
                  objectFit: 'contain' 
                }} 
              />
            </Box>
          )}

        <TextField
            fullWidth
            label="Instagram Handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'pink',
                },
                '&:hover fieldset': {
                  borderColor: 'pink',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'pink',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'pink',
                '&.Mui-focused': {
                  color: 'pink',
                },
              },
              '& .MuiInputBase-input': {
                color: 'pink',
              },
            }}
          />

          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            fullWidth
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate Captions'}
          </Button>
        </Box>
      </form>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {captions && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Generated Captions
          </Typography>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Short Caption
              </Typography>
              <Typography>{captions.shortCaption}</Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Medium Caption
              </Typography>
              <Typography>{captions.mediumCaption}</Typography>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Long Caption
              </Typography>
              <Typography>{captions.longCaption}</Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};