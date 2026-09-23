import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { del } from '@vercel/blob';
import { google } from 'googleapis';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Readable } from 'stream';

// Tell Vercel to allow this function to run for up to 60 seconds
export const maxDuration = 60;

// Upstash QStash webhook handler
async function handler(request: Request) {
  try {
    const body = await request.json();
    let { videoUrl, blobName, description, platforms } = body;

    console.log(`Webhook triggered for video: ${blobName}`);

    // Fetch the video data from Vercel Blob into memory
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error('Failed to download video from Vercel Blob');
    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    
    // 1. AI Caption Generation
    if (!description || description.trim() === '') {
      if (process.env.GEMINI_API_KEY) {
        console.log('Generating AI caption...');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Flash is faster for serverless
        
        // We can pass the inline data directly to Gemini without saving to disk
        const prompt = "Watch this video and write an engaging, viral social media caption with 3-5 trending hashtags. Do not include quotes.";
        
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: videoBuffer.toString("base64"),
              mimeType: "video/mp4"
            }
          }
        ]);
        description = result.response.text().trim();
        console.log('Generated Caption:', description);
      } else {
        description = "Check out this new video! 🔥 #viral";
      }
    }

    // 2. Upload to YouTube
    if (platforms.includes('youtube')) {
      if (process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REFRESH_TOKEN) {
        console.log('Uploading to YouTube...');
        const oauth2Client = new google.auth.OAuth2(
          process.env.YOUTUBE_CLIENT_ID,
          process.env.YOUTUBE_CLIENT_SECRET,
          'https://developers.google.com/oauthplayground'
        );
        oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        
        // Convert Buffer to Readable Stream for googleapis
        const stream = new Readable();
        stream.push(videoBuffer);
        stream.push(null);

        await youtube.videos.insert({
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: `Short - ${blobName}`,
              description: description,
              categoryId: '22',
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
          },
          media: {
            body: stream,
          },
        });
        console.log('YouTube upload complete.');
      } else {
        console.warn('YouTube credentials missing. Skipping YouTube upload.');
      }
    }

    // 3. Upload to Facebook
    if (platforms.includes('facebook')) {
      if (process.env.FACEBOOK_PAGE_ID && process.env.META_ACCESS_TOKEN) {
        console.log('Uploading to Facebook...');
        const fbUrl = `https://graph.facebook.com/v20.0/${process.env.FACEBOOK_PAGE_ID}/videos`;
        
        const formData = new FormData();
        formData.append('description', description);
        formData.append('access_token', process.env.META_ACCESS_TOKEN);
        
        // Convert Buffer to Blob for fetch API
        const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
        formData.append('source', videoBlob, blobName);

        const fbResponse = await fetch(fbUrl, {
          method: 'POST',
          body: formData,
        });
        
        const fbResult = await fbResponse.json();
        if (!fbResponse.ok) {
           console.error('Facebook upload error:', fbResult);
           // We do not throw here so we can still clean up the Vercel Blob
        } else {
           console.log('Facebook upload complete. ID:', fbResult.id);
        }
      } else {
        console.warn('Facebook credentials missing. Skipping Facebook upload.');
      }
    }

    // 4. Clean up Vercel Blob
    console.log('Cleaning up video from Vercel Blob...');
    await del(videoUrl);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Wrap the handler with Upstash signature verification to ensure only Upstash can call this API
export const POST = verifySignatureAppRouter(handler);
