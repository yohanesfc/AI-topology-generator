# 📋 TODO — Network Automation

## 🔥 High Priority

- [ ] **Export Topology** — download as PNG / SVG / JSON
- [ ] **IP Mapping** — map LLM-generated IPs to actual EVE-NG Docker container IPs
- [ ] **Rate limit protection** — handle Groq TPD limit gracefully (show countdown, fallback model)
- [ ] **Input validation** — sanitize prompt before sending to LLM

## 🚀 Features

- [ ] **Multi-topology workspace** — tabs untuk switch antar topologi
- [ ] **Rename from chat** — `rename FW1 Firewall-Core` command in prompt
- [ ] **Traceroute** — re-enable with private IP restriction only
- [ ] **Push config to device** — via SSH, paste config langsung ke device
- [ ] **Config diff** — compare generated config vs running config
- [ ] **Topology templates** — pre-built templates (datacenter, campus, SOHO, ISP)
- [ ] **Chain of Thought for topology** — show reasoning expandable in UI
- [ ] **Dark/Light mode toggle**

## 🤖 AI / LLM

- [ ] **Multi-model support** — dropdown pilih model (Llama 3.3, Mixtral, Gemma)
- [ ] **Fallback model** — auto switch ke model lain saat rate limit
- [ ] **Token usage counter** — tampilkan estimasi token per request
- [ ] **Prompt history** — simpan dan re-use prompt sebelumnya
- [ ] **Config validation** — LLM review config yang dihasilkan sebelum ditampilkan

## 🔒 Security

- [ ] **Authentication** — login page sebelum akses app
- [ ] **Per-user topology storage** — isolasi data per user
- [ ] **Audit log** — catat semua aksi (generate, deploy, SSH)
- [ ] **Traceroute hardening** — restrict ke private IP only

## 🔧 Infrastructure

- [ ] **Docker compose** — containerize app untuk easy deployment
- [ ] **Health check endpoint** — `/api/health` untuk monitoring
- [ ] **Webhook notification** — notif ke Telegram/Slack saat Ansible job selesai
- [ ] **Backup topologies** — auto backup `data/topologies.json` ke S3/GCS

## 🐛 Known Issues

- [ ] VXLAN config kadang gagal parse JSON (LLM output tidak konsisten)
- [ ] Traceroute disabled sementara (info disclosure via hop pertama)
- [ ] Node rename via action panel tidak sync dengan double-click rename
- [ ] Canvas height tidak responsive di layar kecil

## ✅ Completed

- [x] AI topology generation (Structured + Chain of Thought)
- [x] Interactive React Flow canvas dengan hierarchical layout
- [x] SSH terminal in-browser (password + public key)
- [x] Generate CLI config (OSPF, BGP, EIGRP, Static, VLAN, MPLS, SR-TE, VXLAN)
- [x] Save / Load topology (server-side JSON)
- [x] Ping dari node action panel
- [x] Deploy ke Ansible Semaphore
- [x] Security hardening (headers, API auth, scanner blocking)
- [x] Production build (no dev mode path disclosure)
- [x] Extended node types (IDS, IPS, Cloud, Core Router, NAS, dll)
- [x] Copy config to clipboard
- [x] Config modal with blur backdrop
