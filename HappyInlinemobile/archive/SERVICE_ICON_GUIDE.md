# 🎨 Service Icon Reference Guide

## How It Works

The app automatically selects icons based on service names. If a service name contains any of these keywords, it gets the corresponding icon.

## Icon Mappings

### ✂️ Haircut Services
**Keywords:** `haircut`, `hair cut`, `cut`  
**Icon:** Scissors (`cut`)  
**Examples:**
- "Haircut"
- "Men's Haircut"
- "Kids Hair Cut"
- "Regular Cut"

---

### 🪒 Shaving Services
**Keywords:** `shav`, `razor`  
**Icon:** Razor (`cut-outline`)  
**Examples:**
- "Shaving"
- "Hot Shave"
- "Razor Shave"
- "Face Shaving"

---

### 🧔 Beard Services
**Keywords:** `beard`  
**Icon:** Question circle (`help-circle-outline`)  
**Examples:**
- "Beard Care"
- "Beard Trim"
- "Beard Shaping"
- "Beard Grooming"

---

### 💊 Treatment Services
**Keywords:** `treatment`, `therapy`, `mask`, `condition`  
**Icon:** Plus circle (`add-circle`)  
**Examples:**
- "Hair Treatment"
- "Scalp Therapy"
- "Hair Mask"
- "Deep Conditioning"

---

### ⭐ Styling Services
**Keywords:** `style`, `styling`  
**Icon:** Star (`star-outline`)  
**Examples:**
- "Hair Style"
- "Hair Styling"
- "Custom Styles"
- "Special Occasion Styling"

---

### 🎨 Coloring Services
**Keywords:** `color`, `dye`, `highlight`  
**Icon:** Palette (`color-palette-outline`)  
**Examples:**
- "Hair Coloring"
- "Hair Dye"
- "Highlights"
- "Color Treatment"

---

### ✂️ Trimming Services
**Keywords:** `trim`  
**Icon:** Scissors (`cut`)  
**Examples:**
- "Trim"
- "Beard Trim"
- "Hair Trim"
- "Quick Trim"

---

### 💧 Washing Services
**Keywords:** `wash`, `shampoo`  
**Icon:** Water drop (`water-outline`)  
**Examples:**
- "Hair Wash"
- "Shampoo"
- "Head Wash"
- "Wash & Dry"

---

### 👋 Massage Services
**Keywords:** `massage`  
**Icon:** Hand (`hand-left-outline`)  
**Examples:**
- "Head Massage"
- "Scalp Massage"
- "Relaxation Massage"

---

## Default Icon
If service name doesn't match any keywords, it defaults to **Scissors** (`cut`)

---

## How to Name Services for Best Icons

### ✅ Good Service Names (Auto-recognized)
- "Haircut & Styling" → Scissors
- "Hot Towel Shaving" → Razor
- "Beard Trim & Shape" → Beard icon
- "Deep Hair Treatment" → Plus circle
- "Color Highlights" → Palette

### ❌ Poor Service Names (Uses Default)
- "Service 1" → Default scissors
- "Package A" → Default scissors
- "Quick Service" → Default scissors

### 💡 Pro Tips
1. **Include descriptive keywords** in service names
2. **Use specific terms** like "haircut", "shaving", "treatment"
3. **Match common search terms** customers use
4. **Be consistent** with naming across services

---

## Custom Icons (Future Feature)

In the future, you'll be able to upload custom icons by adding an `icon_url` field to your service. The app will use the custom icon if provided, otherwise it falls back to the automatic mapping.

```javascript
// Future feature
service = {
  name: "Premium Package",
  icon_url: "https://your-storage.com/custom-icon.png" // Custom icon
}
```

---

## Testing Icons

To test if your service names are working:

1. Create a service with a descriptive name
2. Go to Shop Details → Services tab
3. Check the icon in the coral/red square
4. If it's just scissors, add relevant keywords to the name

**Example:**
- ❌ "Service A" → Generic scissors
- ✅ "Service A - Haircut & Style" → Scissors (haircut keyword found!)

---

## Need a Different Icon?

The system uses Ionicons library. Available icons include:
- `cut` - Scissors
- `cut-outline` - Razor
- `water-outline` - Water drop
- `color-palette-outline` - Paint palette
- `star-outline` - Star
- `add-circle` - Plus in circle
- `help-circle-outline` - Question mark
- `hand-left-outline` - Hand

To request a new icon mapping, add it to the `getServiceIcon()` function in `SelectableServiceItem.jsx`.
