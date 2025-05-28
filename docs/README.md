# PandaAGI SDK Documentation

This directory contains the Mintlify documentation for the PandaAGI SDK.

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Install Mintlify CLI:
```bash
npm install -g mintlify
```

2. Install dependencies:
```bash
npm install
```

### Development

Start the development server:
```bash
npm run dev
```

The documentation will be available at `http://localhost:3000`.

### Building

Build the documentation for production:
```bash
npm run build
```

## Structure

- `mint.json` - Main configuration file
- `introduction.mdx` - Homepage
- `quickstart.mdx` - Quick start guide
- `installation.mdx` - Installation instructions
- `concepts/` - Core concept documentation
- `client/` - Client SDK documentation
- `tools/` - Tools documentation
- `examples/` - Example implementations
- `api-reference/` - API reference documentation

## Contributing

1. Create or edit `.mdx` files in the appropriate directory
2. Update `mint.json` navigation if adding new pages
3. Test locally with `npm run dev`
4. Submit a pull request

## Deployment

The documentation is automatically deployed when changes are pushed to the main branch.

## Support

For questions about the documentation, please open an issue in the main repository. 