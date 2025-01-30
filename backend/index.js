require('dotenv').config();
const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const app = express();
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const CaptionFormat = z.object({
    shortCaption: z.string(),
    mediumCaption: z.string(),
    longCaption: z.string()
});

const photosDir = path.join(__dirname, 'photos');
if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, photosDir)
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Replace the existing app.use(cors()) with this:
app.use(cors({
    origin: ['http://localhost:5173', 'https://your-production-frontend-url.com'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
  }));
app.use(express.json());

app.post('/generate-caption', upload.single('photo'), async (req, res) => {
    const { handle } = req.body;
    
    if (!handle || !req.file) {
        return res.status(400).json({ error: 'Handle and photo are required' });
    }

    try {
        const photoPath = req.file.path;
        
        if (!fs.existsSync(photoPath)) {
            return res.status(404).json({ error: 'Photo not found' });
        }

        const imageBuffer = fs.readFileSync(photoPath);
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;

        // get user data
        const instaResponse = await axios.get(`https://instagram-scraper-api2.p.rapidapi.com/v1/info`, {
            params: {
                username_or_id_or_url: handle
            },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
            }
        });

        // get recent posts and captions
        const postsResponse = await axios.get(`https://instagram-scraper-api2.p.rapidapi.com/v1/posts`, {
            params: {
                username_or_id_or_url: handle
            },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
            }
        });

        const profileData = instaResponse.data.data;
        const posts = postsResponse.data.data.items || [];
        
        let recentCaptions = [];
        if (Array.isArray(posts)) {
            recentCaptions = posts
                .map(post => post.caption?.text)
                .filter(caption => caption)
                .slice(0, 5);
        }

        console.log('Account Owner Details:', {
            fullName: profileData.full_name,
            pronouns: profileData.pronouns || 'N/A',
            gender: profileData.gender || 'N/A',
            isVerified: profileData.is_verified,
            bio: profileData.biography,
            accountType: profileData.category,
            followers: profileData.follower_count,
            recentCaptions
        });

        // generate captions
        const rawCaptions = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user", // to avoid `Image URLs are only allowed for messages with role 'user', but this message with role 'system' contains an image URL.`
                    content: [
                        {
                            type: "text",
                            text: `Generate 3 variations of an Instagram caption for this image: a short version (1-2 lines), a medium version (2-3 lines), and a long version (3-4 lines).

                            Account owner details:
                            - Name: ${profileData.full_name}
                            - Gender/Identity: Account owned by a ${profileData.gender === 'female' ? 'woman' : profileData.gender === 'male' ? 'man' : 'person'}
                            - Bio: ${profileData.biography || 'N/A'}
                            - Account type: ${profileData.category || 'Personal'}
                            - Typical engagement: ${profileData.follower_count || 0} followers

                            Their recent captions for inspiration:
                            ${recentCaptions.map((caption, i) => `${i + 1}. ${caption}`).join('\n')}

                            Instructions:
                            1. Study their previous captions for:
                               - Writing style and tone
                               - Emoji usage patterns
                               - Hashtag preferences
                               - Common themes or phrases
                            2. Generate captions that match their voice while staying unique
                            3. Ensure the captions align with their identity and personal brand
                            4. Include relevant hashtags in their style
                            5. Keep it natural and engaging

                            Format the response exactly like this:
                            SHORT:
                            [short caption]

                            MEDIUM:
                            [medium caption]

                            LONG:
                            [long caption]`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: dataUrl,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 500
        });

        // 2nd llm call with structured output settings for consistency
        const structuredCompletion = await openai.beta.chat.completions.parse({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "Parse the given caption variations into a structured format with short, medium, and long versions."
                },
                {
                    role: "user",
                    content: rawCaptions.choices[0].message.content
                }
            ],
            response_format: zodResponseFormat(CaptionFormat, "captions")
        });

        const structuredCaptions = structuredCompletion.choices[0].message.parsed;

        res.json({ 
            captions: structuredCaptions,
            success: true 
        });

    } catch (error) {
        console.error('Error details:', error.message);
        
        if (error.response) {
            console.error('API Error Response:', error.response.data);
            return res.status(error.response.status).json({
                error: 'API error',
                details: error.response.data
            });
        } else if (error.request) {
            return res.status(503).json({
                error: 'No response from API',
                details: 'Service temporarily unavailable'
            });
        } else {
            return res.status(500).json({
                error: 'Failed to generate caption',
                details: error.message
            });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
});