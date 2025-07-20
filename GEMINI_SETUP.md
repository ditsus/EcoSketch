# Gemini AI Integration Setup

## Required API Keys

To use the Gemini AI-powered 3D model generation, you need to set up the following environment variables:

### 1. Google Maps API Key
- Get your API key from [Google Cloud Console](https://console.cloud.google.com/)
- Enable the following APIs:
  - Maps JavaScript API
  - Street View Static API

### 2. Google Gemini API Key
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- Enable Gemini 1.5 Flash model (supports vision)

## Environment Variables

Create a `.env` file in your project root with:

```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

## How It Works

1. **Point Selection**: User clicks on the map to select a location
2. **Street View Fetch**: App fetches Google Street View image at that location
3. **Image Analysis**: Image is sent to Gemini Pro Vision for analysis
4. **JSON Response**: Gemini returns structured JSON describing urban elements
5. **3D Generation**: THREE.js creates a 3D model based on the AI analysis

## Gemini Response Format

The AI returns JSON with this structure:
```json
{
  "has_road": boolean,
  "has_sidewalk": boolean,
  "has_building": boolean,
  "add_trees": boolean,
  "building_count": number,
  "tree_count": number,
  "road_type": string,
  "suggested_changes": string,
  "analysis": string
}
```

## Features

- **Dynamic 3D Models**: Buildings, roads, sidewalks, and trees generated based on AI analysis
- **Urban Heat Island Analysis**: AI suggests improvements for heat reduction
- **Real-time Generation**: 3D scene updates based on actual street view data
- **Interactive Visualization**: Rotating 3D models with proper lighting and shadows 