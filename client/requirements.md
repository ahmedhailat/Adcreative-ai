## Packages
framer-motion | Page transitions and animations for the studio wizard
react-icons | Social media and platform icons (SiFacebook, SiInstagram, etc.)
recharts | Analytics and performance charts for the dashboard
next-themes | Dark mode and theme toggling support

## Notes
- App uses logical CSS properties (ms-, me-, ps-, pe-) for basic RTL compatibility.
- Studio wizard polls GET `/api/creatives/:id` every 2 seconds while status is "generating".
- Base64 image data from the API is used directly as `src` for generated creatives.
