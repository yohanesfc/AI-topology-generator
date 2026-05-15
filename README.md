# 🔀 Network Automation — AI Topology Generator

> Describe your network. We build it.

A **Generative AI-powered** web application for designing network topologies from natural language. Type a description, get an interactive topology diagram, device configurations, and Ansible deployment — all in one place.

**Live:** https://auto-net.yohanesfc.web.id

---

## ✨ Features

### 🧠 AI Topology Generation
- Describe your network in plain text (supports Bahasa Indonesia & English)
- Two generation modes:
  - **📐 Structured Output** — fast, direct JSON generation
  - **🧠 Chain of Thought** — LLM reasons step-by-step before generating (more logical topology)
- Auto IP address assignment per device type
- Max 20 devices per topology

### 🗺️ Interactive Canvas
- Hierarchical layout (Firewall → Router → Switch → Server → PC)
- Animated traffic flow edges
- Click node → Action Panel (Rename, Ping, SSH)
- Double-click node → inline rename
- MiniMap + zoom controls

### ⚙️ Device Configuration Generator
- Generate CLI configs for all devices from topology
- Supported protocols: **OSPF, BGP, EIGRP, Static Routing, VLAN, MPLS, SR-TE, VXLAN**
- Chain of Thought mode shows reasoning per device
- Copy config to clipboard per device
- Modal popup with blur backdrop

### 🖥️ SSH Terminal In-Browser
- Click any node → SSH Terminal
- Auth methods: Password or Public Key (`~/.ssh/id_rsa`)
- Built on `ssh2` + WebSocket (port 7501)

### 🏓 Network Tools
- **Ping** directly from node action panel
- Output displayed inline

### 💾 Save / Load Topology
- Save multiple topologies server-side (JSON file)
- Load and switch between saved projects

### 🚀 Ansible Integration
- Deploy topology to Ansible Semaphore
- Auto-generate INI inventory from devices
- Grouped by type: `[firewalls]`, `[routers]`, `[switches]`, `[servers]`, `[pcs]`

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| AI Engine | Llama 3.3 70B via Groq API |
| Schema Validation | Zod |
| Topology Canvas | React Flow (`@xyflow/react`) |
| SSH Terminal | xterm.js + ssh2 + WebSocket |
| Process Manager | PM2 |
| Reverse Proxy | Caddy + Cloudflare |
| Automation | Ansible Semaphore |
| Styling | Tailwind CSS |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Groq API key (free at https://console.groq.com)
- PM2 (`npm install -g pm2`)

### Installation

```bash
git clone https://github.com/yohanesfc/AI-topology-generator.git
cd AI-topology-generator
npm install
```

### Environment Variables

Create `.env.local`:

```env
GROQ_API_KEY=gsk_...
API_SECRET_KEY=your_random_secret_key
NEXT_PUBLIC_API_SECRET_KEY=your_random_secret_key

# Optional - Ansible Semaphore integration
SEMAPHORE_URL=http://your-semaphore:3000
SEMAPHORE_TOKEN=your_semaphore_token
```

### Run Development

```bash
npm run dev
```

### Run Production

```bash
npm run build

# App (port 7500)
pm2 start npm --name "net-auto" -- start -- -p 7500

# SSH WebSocket server (port 7501)
pm2 start ssh-server.js --name "ssh-ws"

pm2 save
```

---

## 📁 Project Structure
├── app/
│   ├── page.tsx                    # Main UI
│   ├── globals.css                 # Tailwind + React Flow theme
│   └── api/
│       ├── generate-topology/      # Groq LLM → JSON topology
│       ├── generate-config/        # Groq LLM → CLI configs
│       ├── network-tools/          # Ping / Traceroute
│       ├── topologies/             # Save / Load topologies
│       └── semaphore/              # Ansible Semaphore integration
├── components/
│   ├── TopologyCanvas.tsx          # Dynamic import wrapper
│   ├── TopologyCanvasInner.tsx     # React Flow canvas + layout
│   └── SshTerminal.tsx             # SSH terminal component
├── lib/
│   └── schema.ts                   # Zod topology schema
├── ssh-server.js                   # WebSocket SSH server
└── next.config.js                  # Security headers config
---

## 🔒 Security

- API endpoints protected with `x-api-key` header
- Production build (no dev mode path disclosure)
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, `Referrer-Policy`
- Scanner blocking via Caddy (`.env`, `.git`, `wp-admin`, etc.)
- Network tools restricted to private IP ranges

---

## 🖥️ Supported Node Types

| Type | Emoji | Color |
|---|---|---|
| Firewall | 🛡️ | Red |
| IDS / IPS | 🔍 🚨 | Dark Red |
| Cloud / Internet | ☁️ 🌐 | Light Blue |
| Router / Core Router / Cisco Router | 🔀 | Orange |
| Layer 3 Switch | 🔃 | Dark Orange |
| Switch / Core Switch | 🔌 | Green |
| Access Point / WAP | 📡 📶 | Cyan |
| Server / Core Server / Web / DNS / DHCP | 🖥️ 🗄️ | Purple |
| PC / Laptop / Workstation | 💻 🖱️ | Blue |
| Printer / Phone | 🖨️ 📱 | Dark Blue |

---

## 📝 Example Prompts
buat topologi kantor dengan 1 firewall, 2 router, 4 switch, 10 PC
create datacenter topology with core router, layer 3 switch,
web server, DNS server, NAS, and 5 workstations
topologi ISP dengan cloud, IDS, IPS, 2 core router BGP,
4 distribution switch, 20 PC
---

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

*Built with ❤️ on EVE-NG homelab running Oracle Cloud (Ubuntu 22.04, ARM64)*
