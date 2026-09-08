# 🔀 Domain Swap

Browser extension that automatically redirects specific domains to other configurable destinations.

## 📋 Features

- ✅ Compatible with Chrome, Edge, Brave, and other Chromium-based browsers
- ✅ Configurable automatic redirects
- ✅ Intuitive interface for managing rules
- ✅ Enable/disable redirects individually
- ✅ Export and import configurations
- ✅ Preserves the full URL path and parameters

## 🚀 Installation

### Chrome / Edge / Brave

1. Download or clone this repository
2. Open your browser and go to the extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
3. Enable **Developer mode** in the top right corner
4. Click on **Load unpacked**
5. Select the folder containing the extension files

### Firefox

For Firefox, you need to modify the manifest.json:

```json
{
  "manifest_version": 2,
  "browser_specific_settings": {
    "gecko": {
      "id": "domain-swap@example.com"
    }
  }
}
```

Then:
1. Open Firefox and go to `about:debugging`
2. Click on **This Firefox**
3. Click on **Load Temporary Add-on**
4. Select the `manifest.json` file

## 📖 Usage

### Adding a redirect

1. Click the extension icon in the toolbar
2. In the "From (domain)" field, enter the domain you want to redirect (e.g., `old-domain.com`)
3. In the "To (domain)" field, enter the destination domain (e.g., `new-domain.com`)
4. Click **Add Redirect**

**Note:** Protocols like `https://` will be cleaned automatically, but make sure not to include any path (like `/page`).

### Managing redirects

- **Enable/Disable**: Use the switch on each redirect to temporarily toggle it
- **Delete**: Click the 🗑️ icon to remove a redirect
- **View all**: All configured redirects are displayed in the list view

### Export/Import configuration

- **Export**: Click "Export" to save your redirects to a JSON file
- **Import**: Click "Import" and select a previously exported JSON file
  - When importing, you can choose to either overwrite or merge with the current configuration

## 📁 Project Structure

```
domain-swap/
├── manifest.json       # Extension configuration
├── background.js       # Background service worker (redirect logic)
├── popup.html          # User interface HTML
├── popup.js            # User interface logic
├── styles.css          # Styling
└── README.md           # This file
```

## ⚠️ Important Notes

- Redirects only work with HTTP/HTTPS protocols
- Domains must be valid (format: `example.com` or `subdomain.example.com`)
- The extension uses the `declarativeNetRequest` API, which is more efficient and secure than `webRequest`
- Configurations sync automatically if you have browser synchronization enabled

## 🔒 Permissions

The extension requires the following permissions:

- `storage`: To save redirect configurations
- `declarativeNetRequest`: To perform the network redirects
- `<all_urls>`: Required to intercept and redirect the configured domains

## 🐛 Troubleshooting

### Redirect is not working

1. Verify that the redirect toggle is active (green)
2. Make sure you haven't included any paths (like `/about`)
3. Reload the extension from your browser's extensions page
4. Verify the domain is spelled correctly

### Error importing configuration

- Ensure the JSON file uses the correct format
- The file must be an array of objects with these properties: `id`, `from`, `to`, `enabled`

## 📝 License

This project is licensed under the MIT License. You can use, modify, and distribute it freely.

## 🤝 Contributing

Contributions are welcome. If you find a bug or have a suggestion, please open an issue or submit a pull request.

## 📧 Support

If you have issues or questions, please open an issue in the project repository.
