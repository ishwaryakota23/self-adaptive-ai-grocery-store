# Local kiosk to phone handoff

1. Connect the kiosk laptop and phone to the same Wi-Fi network.
2. Start the Vite app with `npm run dev` (the project script binds to `0.0.0.0` on port `3000`). Allow Node/Vite through the laptop firewall for private networks if prompted.
3. Sign in at the kiosk, start a shopping session, and open **Switch to Mobile**. Choose **Phone Wi-Fi** and scan the QR. The app detects the laptop's LAN address; it does not use a fixed machine IP.
4. If automatic LAN detection is unavailable, set the server-side `APP_BASE_URL` to `http://<current-laptop-LAN-IP>:3000`, restart the dev server, and retry. Use the current IPv4 shown by the laptop's network settings; do not commit a machine-specific value.
5. Choose **Localhost** only when opening the companion on the same laptop. A phone cannot reach the laptop through `localhost`.

The QR contains the server-issued, single-use session handoff token. The server validates the verified customer, active session, expiry, and shared cart; it does not create a new cart. Test on a physical phone to verify firewall and Wi-Fi behavior.
