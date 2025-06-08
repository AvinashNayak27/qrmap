# QR Map Setup Guide

## Authentication
- **Web Version**: Requires wallet connection using RainbowKit (in components/CameraLayout.tsx)
- **Frame Mini App**: Automatically uses Farcaster Frame context for user identification

## Prerequisites
- Supabase account
- RainbowKit setup for web version
- Farcaster Frame SDK for mini app version

## Supabase Setup

### 1. Storage Setup
1. Create a new Supabase project
2. Navigate to Storage section in dashboard
3. Create a new bucket named "images"
4. Configure bucket permissions:
   - Enable public access for reading
   - Restrict uploads to authenticated users
   
### 2. Database Schema

The application uses a table named `qrmap` with the following structure:

#### Table: qrmap
- `id`: Unique identifier (auto-incrementing)
- `created_at`: Timestamp of creation
- `image_url`: URL of the stored image
- `latitude`: Geographic latitude of the photo location
- `longitude`: Geographic longitude of the photo location
- `uploader_id`: farcaster name > ens >basename >address
- `uploader_type`: Type of uploader ("farcaster","ens","basename","address")
- `city`: City name where photo was taken
- `fid`: Farcaster ID (when using Frame)

### 3. Image Upload Process

The `confirmAddToMap` function handles the image upload and database insertion process with the following steps:

1. **Image Processing**:
   - Converts the captured image from data URL to Blob format
   - Generates a unique filename using timestamp

2. **Storage Upload**:
   - Uploads the image to Supabase storage bucket "images"
   - Retrieves the public URL for the uploaded image

3. **Location Processing**:
   - Uses the device's geolocation (latitude/longitude)
   - Performs reverse geocoding to determine the city name

4. **Database Insertion**:
   - Inserts a new record into the `qrmap` table with:
     - Image URL from storage
     - Location coordinates
     - Uploader information (wallet address or Farcaster FID)
     - City name from reverse geocoding
     - Uploader type ("wallet" or "farcaster")
     - Farcaster ID (when applicable)

