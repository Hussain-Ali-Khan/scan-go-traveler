# DocuScan AI

An AI-powered document data extraction tool that automatically extracts and organizes information from travel documents including passports, visas, and flight tickets.

## Features

- 📄 **Multi-Document Support**: Upload and process multiple passports, visas, and flight tickets simultaneously
- 🤖 **AI-Powered Extraction**: Leverages Google Gemini AI for accurate OCR and intelligent data extraction
- 👥 **Smart Passenger Consolidation**: Automatically merges data from multiple documents belonging to the same passenger
- 📊 **Data Table View**: View all extracted information in a clean, organized table format
- 💾 **CSV Export**: Export extracted data to CSV format for use in spreadsheets and other applications
- 🖼️ **Drag & Drop Upload**: Easy file upload with intuitive drag-and-drop interface
- ✅ **File Validation**: Accepts only valid image formats (JPG, PNG, WEBP)
- 🎨 **Modern UI**: Beautiful, responsive interface built with Tailwind CSS and shadcn/ui

## Technology Stack

### Frontend
- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React component library
- **TanStack Query** - Data fetching and state management
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icon library

### Backend
- **Lovable Cloud** - Full-stack backend platform
- **Supabase Edge Functions** - Serverless functions powered by Deno
- **Lovable AI Gateway** - AI model access (Google Gemini 2.5 Flash)

## Project Structure

```
docuscan-ai/
├── src/
│   ├── components/
│   │   ├── DocumentUpload.tsx      # Drag-and-drop file upload component
│   │   ├── DocumentPreview.tsx     # Preview uploaded document images
│   │   ├── ExtractedDataTable.tsx  # Display extracted data in table
│   │   └── ui/                     # shadcn/ui component library
│   ├── pages/
│   │   ├── Index.tsx               # Main application page
│   │   └── NotFound.tsx            # 404 page
│   ├── integrations/
│   │   └── supabase/               # Supabase client configuration
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utility functions
│   └── main.tsx                    # Application entry point
├── supabase/
│   └── functions/
│       └── extract-document-data/  # AI document extraction edge function
├── public/                         # Static assets
└── ...
```

## How It Works

1. **Upload Documents**: Drag and drop or click to upload images of passports, visas, and flight tickets
2. **Process with AI**: Click "Process Documents" to send images to the AI extraction service
3. **Data Extraction**: The AI analyzes each image and extracts relevant information based on document type
4. **Smart Consolidation**: The system automatically consolidates data by passenger, matching documents using:
   - Passport numbers (primary identifier)
   - Fuzzy name matching (for cases without passport numbers)
5. **View Results**: Extracted data is displayed in an organized table with all passenger information
6. **Export Data**: Export the consolidated data to CSV format for further processing

## Extracted Data Fields

### From Passports
- Full Name
- Passport Number
- Date of Birth
- Nationality
- Expiry Date

### From Visas
- Full Name
- Passport Number
- Date of Birth
- Nationality
- Expiry Date
- Visa Type

### From Flight Tickets
- Passenger Name
- Flight Number
- Departure Airport/City
- Arrival Airport/City
- Flight Date

## Getting Started

### Prerequisites

- Node.js 18+ and npm installed
- Git for cloning the repository

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd docuscan-ai
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Deployment

This project is built with Lovable and can be easily deployed:

1. Click the **Publish** button in the Lovable editor (top right on desktop, bottom right on mobile)
2. Your app will be deployed to a Lovable staging subdomain
3. Optional: Connect a custom domain in Project > Settings > Domains

For more deployment options, visit: https://docs.lovable.dev/

## Environment Variables

The following environment variables are automatically configured by Lovable Cloud:

- `VITE_SUPABASE_URL` - Backend API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier
- `LOVABLE_API_KEY` - AI Gateway access key (backend only)

## Usage Tips

- **Supported Formats**: JPG, PNG, and WEBP images
- **Best Results**: Use clear, well-lit photos of documents
- **Multiple Documents**: Upload all documents before clicking "Process Documents"
- **Data Consolidation**: Documents with matching passport numbers are automatically merged
- **Export**: Click "Export to CSV" to download all extracted data

## Contributing

This project was built with [Lovable](https://lovable.dev/), an AI-powered web application builder.

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
- Visit the [Lovable Documentation](https://docs.lovable.dev/)
- Join the [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

**Built with ❤️ using [Lovable](https://lovable.dev/)**
