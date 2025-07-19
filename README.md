# HackThe6ix Map Area Selector

A modern React application that allows users to select areas on Google Maps using drawing tools. Users can draw polygons, rectangles, and circles to define specific geographic areas.

## Features

- **Interactive Map**: Full Google Maps integration with zoom, pan, and map type controls
- **Multiple Drawing Tools**: Support for polygons, rectangles, and circles
- **Real-time Area Calculation**: Automatic calculation of selected area in square kilometers/meters
- **Detailed Information**: Display of coordinates, bounds, and area measurements
- **Export Functionality**: Download selected area data as JSON
- **Modern UI**: Clean, responsive design with styled-components
- **Editable Shapes**: Modify drawn shapes by dragging vertices

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn
- Google Maps API key with the following APIs enabled:
  - Maps JavaScript API
  - Drawing Library
  - Geometry Library

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hackthe6ixMap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Google Maps API Key**
   
   Create a `.env` file in the root directory:
   ```bash
   REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```
   
   **Important**: Replace `your_google_maps_api_key_here` with your actual Google Maps API key.

4. **Start the development server**
   ```bash
   npm start
   ```

   The application will open at `http://localhost:3000`

## Getting a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Drawing Library
   - Geometry Library
4. Create credentials (API Key)
5. Restrict the API key to your domain for security

## Usage

1. **Start Area Selection**: Click the "Start Area Selection" button in the sidebar
2. **Draw Shapes**: 
   - **Polygon**: Click multiple points to create a polygon, double-click to finish
   - **Rectangle**: Click and drag to create a rectangle
   - **Circle**: Click and drag to create a circle
3. **View Information**: Once an area is selected, view detailed information in the sidebar
4. **Export Data**: Click "Download JSON" to export the selected area data
5. **Clear Selection**: Click "Clear Selection" to remove the current area

## Project Structure

```
hackthe6ixMap/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── MapAreaSelector.js    # Main Google Maps component
│   │   └── AreaInfo.js          # Sidebar information component
│   ├── App.js                   # Main application component
│   └── index.js                 # Application entry point
├── package.json
└── README.md
```

## API Response Format

When an area is selected, the application generates a JSON object with the following structure:

```json
{
  "type": "polygon|rectangle|circle",
  "coordinates": [
    {"lat": 43.6532, "lng": -79.3832},
    // ... more coordinates
  ],
  "area": 1.25,
  "bounds": {
    "north": 43.6532,
    "south": 43.6500,
    "east": -79.3800,
    "west": -79.3832
  }
}
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Technologies Used

- **React 18** - Frontend framework
- **Google Maps JavaScript API** - Map functionality
- **styled-components** - CSS-in-JS styling
- **@googlemaps/js-api-loader** - Google Maps API loader

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Map Not Loading
- Ensure your Google Maps API key is correctly set in the `.env` file
- Check that the required APIs are enabled in Google Cloud Console
- Verify that your API key has the necessary permissions

### Drawing Tools Not Working
- Make sure the Drawing Library and Geometry Library are enabled
- Check the browser console for any JavaScript errors

### Area Calculation Issues
- Ensure the Geometry Library is enabled in your Google Cloud Console
- Check that the shape is properly closed (for polygons)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the repository or contact the development team. 