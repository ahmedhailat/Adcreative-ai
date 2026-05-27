---
name: Gemini text-only generation calls
description: Correct pattern for Gemini text-only generateContent calls
---

## Rule
For text-only Gemini calls, do NOT include a `config` object. The `outputModalities` property doesn't exist in `GenerateContentConfig` type and causes TypeScript errors.

```typescript
// CORRECT - text only
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [{ role: "user", parts: [{ text: prompt }] }],
});

// CORRECT - image generation (needs config)
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [...],
  config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
});
```

**Why:** The TypeScript types for GenerateContentConfig don't include outputModalities; Modality enum is only needed for image generation responses.
