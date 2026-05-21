export interface TemplateData {
  topologyName: string;
  mode: string;
  reasoning: string;
  devices: { id: string; type: string; name: string; ipAddress: string }[];
  connections: { from: string; to: string; interface: string }[];
}

export interface Template {
  name: string;
  desc: string;
  icon: string;
  data: TemplateData;
}

export const TEMPLATES: Template[] = [
  {
    name: "🏠 SOHO Network",
    desc: "Small Office / Home Office. Perfect for small businesses.",
    icon: "🏠",
    data: {
      topologyName: "Small Office / Home Office (SOHO) Network",
      mode: "Structured",
      reasoning: "A SOHO network layout designed for efficiency and ease of maintenance. It features an ISP Internet Cloud connecting to a Boundary Gateway Router, which distributes connections to a central Workgroup Switch. End devices (PC, Laptop via WAP, and a centralized NAS storage) are segmentally organized to keep local network traffic quick and isolated.",
      devices: [
        { id: "ISP", type: "Internet", name: "Internet WAN", ipAddress: "100.64.0.1" },
        { id: "R1", type: "Router", name: "ISP Gateway Router", ipAddress: "192.168.1.1" },
        { id: "SW1", type: "Switch", name: "Local Core Switch", ipAddress: "192.168.1.20" },
        { id: "WAP1", type: "Access Point", name: "Office Wi-Fi AP", ipAddress: "192.168.1.21" },
        { id: "NAS1", type: "NAS", name: "Central Backup NAS", ipAddress: "192.168.10.10" },
        { id: "PC1", type: "PC", name: "HR Workstation", ipAddress: "192.168.20.1" },
        { id: "LAP1", type: "Laptop", name: "Manager Laptop", ipAddress: "192.168.20.2" }
      ],
      connections: [
        { from: "ISP", to: "R1", interface: "eth0" },
        { from: "R1", to: "SW1", interface: "G0/0" },
        { from: "SW1", to: "WAP1", interface: "G0/1" },
        { from: "SW1", to: "NAS1", interface: "G0/2" },
        { from: "SW1", to: "PC1", interface: "G0/3" },
        { from: "WAP1", to: "LAP1", interface: "WiFi" }
      ]
    }
  },
  {
    name: "🏢 Enterprise Campus",
    desc: "Multi-department campus network with firewall and core switch.",
    icon: "🏢",
    data: {
      topologyName: "Enterprise Corporate Campus Network",
      mode: "Chain of Thought",
      reasoning: "Campus Network Tiered Architecture. Built with a dedicated boundary Firewall separating the external WAN from our internal network. High-speed Core Routers handle inter-VLAN traffic routing, connecting directly to a powerful Core Switch distribution block. Department switches segment user PCs and office devices (HR, Finance, Printers) for security and broadcast domain containment.",
      devices: [
        { id: "ISP", type: "Internet", name: "Internet Link", ipAddress: "8.8.8.8" },
        { id: "FW1", type: "Firewall", name: "Corporate Firewall", ipAddress: "192.168.1.1" },
        { id: "R1", type: "Core Router", name: "Campus Core Router", ipAddress: "192.168.1.10" },
        { id: "SW-CORE", type: "Core Switch", name: "Nexus Core Switch", ipAddress: "192.168.1.20" },
        { id: "SW-HR", type: "Switch", name: "HR Dept Switch", ipAddress: "192.168.1.21" },
        { id: "SW-FIN", type: "Switch", name: "Finance Dept Switch", ipAddress: "192.168.1.22" },
        { id: "SRV-DC", type: "Server", name: "Active Directory Domain Controller", ipAddress: "192.168.10.2" },
        { id: "PC-HR", type: "PC", name: "HR Operator PC", ipAddress: "192.168.20.10" },
        { id: "PC-FIN", type: "PC", name: "Finance General Ledger PC", ipAddress: "192.168.20.20" },
        { id: "PRN-FIN", type: "Printer", name: "Finance Shared Printer", ipAddress: "192.168.20.30" }
      ],
      connections: [
        { from: "ISP", to: "FW1", interface: "eth0" },
        { from: "FW1", to: "R1", interface: "G0/0" },
        { from: "R1", to: "SW-CORE", interface: "G0/1" },
        { from: "SW-CORE", to: "SW-HR", interface: "G1/0/1" },
        { from: "SW-CORE", to: "SW-FIN", interface: "G1/0/2" },
        { from: "SW-CORE", to: "SRV-DC", interface: "G1/0/3" },
        { from: "SW-HR", to: "PC-HR", interface: "F0/1" },
        { from: "SW-FIN", to: "PC-FIN", interface: "F0/1" },
        { from: "SW-FIN", to: "PRN-FIN", interface: "F0/2" }
      ]
    }
  },
  {
    name: "💾 Cloud Data Center",
    desc: "Redundant Spine-Leaf datacenter with active web and DB tiers.",
    icon: "💾",
    data: {
      topologyName: "Spine-Leaf Enterprise Data Center",
      mode: "Chain of Thought",
      reasoning: "Next-gen Spine-Leaf Data Center architecture. Features redundant Edge Gateway Routers connected to high-availability boundary Firewalls. Spine Layer 3 Switches aggregate traffic dynamically to Spine-Leaf Switch fabrics. High-performance application layers (Web Server clusters, unpatched DB hosts) and NOC Operations PCs are segregated into dedicated VLANs/subnets for deep traffic inspection.",
      devices: [
        { id: "EDGE-R1", type: "Core Router", name: "DC Edge Router A", ipAddress: "192.168.1.10" },
        { id: "EDGE-R2", type: "Core Router", name: "DC Edge Router B", ipAddress: "192.168.1.11" },
        { id: "FW-ACTIVE", type: "Firewall", name: "Active DC Firewall", ipAddress: "192.168.1.1" },
        { id: "L3-SW1", type: "Layer 3 Switch", name: "DC Spine Switch 1", ipAddress: "192.168.1.20" },
        { id: "L3-SW2", type: "Layer 3 Switch", name: "DC Spine Switch 2", ipAddress: "192.168.1.21" },
        { id: "WEB-SRV1", type: "Web Server", name: "Production HTTP Host A", ipAddress: "192.168.10.10" },
        { id: "WEB-SRV2", type: "Web Server", name: "Production HTTP Host B", ipAddress: "192.168.10.11" },
        { id: "DB-SRV", type: "Server", name: "Corporate SQL Database", ipAddress: "192.168.10.20" },
        { id: "NOC-PC", type: "Workstation", name: "NOC Operations Console", ipAddress: "192.168.20.1" }
      ],
      connections: [
        { from: "EDGE-R1", to: "FW-ACTIVE", interface: "G0/0" },
        { from: "EDGE-R2", to: "FW-ACTIVE", interface: "G0/0" },
        { from: "FW-ACTIVE", to: "L3-SW1", interface: "G0/1" },
        { from: "FW-ACTIVE", to: "L3-SW2", interface: "G0/2" },
        { from: "L3-SW1", to: "L3-SW2", interface: "G1/0/24" },
        { from: "L3-SW1", to: "WEB-SRV1", interface: "G1/0/1" },
        { from: "L3-SW1", to: "WEB-SRV2", interface: "G1/0/2" },
        { from: "L3-SW2", to: "WEB-SRV1", interface: "G1/0/1" },
        { from: "L3-SW2", to: "WEB-SRV2", interface: "G1/0/2" },
        { from: "L3-SW2", to: "DB-SRV", interface: "G1/0/3" },
        { from: "L3-SW1", to: "NOC-PC", interface: "G1/0/4" }
      ]
    }
  },
  {
    name: "🌐 ISP Core Transit",
    desc: "Service Provider core network with eBGP/iBGP peers and core routers.",
    icon: "🌐",
    data: {
      topologyName: "ISP Service Provider Core Transit",
      mode: "Structured",
      reasoning: "Service Provider ISP core routing topology. Multiple Tier 1 Transit Cloud links connect to BGP-enabled Provider Edge routers. Provider (P) routers manage heavy MPLS label/traffic forwarding internally, isolating external eBGP paths from internal iBGP exchanges. Critical network infrastructure services (ISP Anycast DNS) are loaded directly on the P-core switches for maximum performance.",
      devices: [
        { id: "TRANSIT-1", type: "Cloud", name: "IP Transit Peer 10G", ipAddress: "100.100.1.1" },
        { id: "PEER-R1", type: "Core Router", name: "eBGP Edge Provider 1", ipAddress: "192.168.1.10" },
        { id: "PEER-R2", type: "Core Router", name: "eBGP Edge Provider 2", ipAddress: "192.168.1.11" },
        { id: "ISP-P1", type: "Core Router", name: "Core P-Router Alpha", ipAddress: "192.168.1.12" },
        { id: "ISP-P2", type: "Core Router", name: "Core P-Router Beta", ipAddress: "192.168.1.13" },
        { id: "CUST-R1", type: "Router", name: "Enterprise Customer Router", ipAddress: "192.168.1.14" },
        { id: "DNS-SRV", type: "DNS Server", name: "ISP Anycast DNS Server", ipAddress: "192.168.10.100" }
      ],
      connections: [
        { from: "TRANSIT-1", to: "PEER-R1", interface: "eth0" },
        { from: "TRANSIT-1", to: "PEER-R2", interface: "eth1" },
        { from: "PEER-R1", to: "ISP-P1", interface: "G0/0" },
        { from: "PEER-R2", to: "ISP-P2", interface: "G0/0" },
        { from: "ISP-P1", to: "ISP-P2", interface: "G0/1" },
        { from: "ISP-P1", to: "DNS-SRV", interface: "G0/2" },
        { from: "ISP-P2", to: "CUST-R1", interface: "G0/2" }
      ]
    }
  },
  {
    name: "📶 5G SA Core Network",
    desc: "5G Standalone architecture with gNodeB, AMF, SMF, UPF, and Data Network.",
    icon: "📶",
    data: {
      topologyName: "5G Standalone (SA) Core Network",
      mode: "Chain of Thought",
      reasoning: "A next-generation 5G Standalone (SA) service-based network architecture. High-frequency 5G User Equipment connects wirelessly to the next-generation Base Station (gNodeB). Control Plane traffic is managed securely by the Access and Mobility Management Function (AMF) and Session Management Function (SMF). Data Plane traffic runs directly through the high-throughput User Plane Function (UPF), which routes user data to the public internet/Data Network while querying the Unified Data Management (UDM) database for authentication.",
      devices: [
        { id: "5G-UE", type: "PC", name: "5G Mobile Device UE", ipAddress: "10.0.1.100" },
        { id: "G-NODEB", type: "Access Point", name: "gNodeB Radio Access Node", ipAddress: "10.0.1.1" },
        { id: "UPF-GW", type: "Core Router", name: "User Plane Function UPF", ipAddress: "10.0.2.1" },
        { id: "AMF-SMF", type: "Server", name: "AMF / SMF Control Functions", ipAddress: "10.0.2.10" },
        { id: "UDM-UDR", type: "NAS", name: "Unified Data Management UDM", ipAddress: "10.0.3.20" },
        { id: "DN-NET", type: "Internet", name: "Data Network DN Internet", ipAddress: "8.8.8.8" }
      ],
      connections: [
        { from: "5G-UE", to: "G-NODEB", interface: "5G-NR Wireless" },
        { from: "G-NODEB", to: "UPF-GW", interface: "N3 GTP-U" },
        { from: "G-NODEB", to: "AMF-SMF", interface: "N2 NGAP" },
        { from: "AMF-SMF", to: "UPF-GW", interface: "N4 PFCP" },
        { from: "AMF-SMF", to: "UDM-UDR", interface: "N8/N10 Service" },
        { from: "UPF-GW", to: "DN-NET", interface: "N6 SGi-LAN" }
      ]
    }
  },
  {
    name: "🔌 Clos Spine-Leaf Fabric",
    desc: "High-performance, non-blocking 3-stage Clos fabric datacenter network.",
    icon: "🔌",
    data: {
      topologyName: "3-Stage Clos Spine-Leaf Data Center Fabric",
      mode: "Structured",
      reasoning: "A non-blocking 3-stage Clos architecture designed for modern east-west data center traffic. Features high-bandwidth, redundant Spine switches connected dynamically to Leaf distribution switches. Every Leaf switch is connected to every Spine switch, creating equal-cost multi-path (ECMP) routing capabilities. Dual-homed production servers (Web, Application, Database) connect to Leaf nodes to achieve maximum redundancy and zero single points of failure.",
      devices: [
        { id: "SPINE-1", type: "Core Switch", name: "Fabric Spine Switch 1", ipAddress: "10.100.1.1" },
        { id: "SPINE-2", type: "Core Switch", name: "Fabric Spine Switch 2", ipAddress: "10.100.1.2" },
        { id: "LEAF-1", type: "Layer 3 Switch", name: "Access Leaf Switch 1", ipAddress: "10.100.2.1" },
        { id: "LEAF-2", type: "Layer 3 Switch", name: "Access Leaf Switch 2", ipAddress: "10.100.2.2" },
        { id: "LEAF-3", type: "Layer 3 Switch", name: "Access Leaf Switch 3", ipAddress: "10.100.2.3" },
        { id: "SRV-WEB", type: "Web Server", name: "Enterprise Load Balanced Web Host", ipAddress: "192.168.10.11" },
        { id: "SRV-APP", type: "Server", name: "Backend Application Engine", ipAddress: "192.168.10.12" },
        { id: "SRV-DB", type: "Server", name: "Spine-Leaf Database Cluster", ipAddress: "192.168.10.20" }
      ],
      connections: [
        { from: "SPINE-1", to: "LEAF-1", interface: "100G-eth1" },
        { from: "SPINE-1", to: "LEAF-2", interface: "100G-eth2" },
        { from: "SPINE-1", to: "LEAF-3", interface: "100G-eth3" },
        { from: "SPINE-2", to: "LEAF-1", interface: "100G-eth1" },
        { from: "SPINE-2", to: "LEAF-2", interface: "100G-eth2" },
        { from: "SPINE-2", to: "LEAF-3", interface: "100G-eth3" },
        { from: "LEAF-1", to: "SRV-WEB", interface: "10G-G0/1" },
        { from: "LEAF-2", to: "SRV-APP", interface: "10G-G0/1" },
        { from: "LEAF-3", to: "SRV-DB", interface: "10G-G0/1" }
      ]
    }
  },
  {
    name: "⚡ ISP NAP Peering Exchange",
    desc: "Network Access Point / IXP with central Peering fabric, Route Server, and multi-AS borders.",
    icon: "⚡",
    data: {
      topologyName: "ISP Network Access Point (NAP) / IXP Peering",
      mode: "Chain of Thought",
      reasoning: "A central Network Access Point (NAP) and Internet Exchange Point (IXP) public peering LAN topology. An ultra-high-speed Peering Switch Fabric acts as the interconnection medium. Separate autonomous system edge routers (ISP AS100 Border, ISP AS200 Border, and ISP AS300 Border) peer directly over this shared segment using BGP. A centralized Route Server coordinates routing tables globally, while root-level infrastructure (Root DNS Server) and global CDNs are co-located right on the exchange LAN for sub-millisecond response times.",
      devices: [
        { id: "IXP-FABRIC", type: "Core Switch", name: "High-Speed IXP Peering LAN", ipAddress: "192.0.2.1" },
        { id: "AS100-GW", type: "Core Router", name: "ISP AS100 Border Gateway", ipAddress: "192.0.2.10" },
        { id: "AS200-GW", type: "Core Router", name: "ISP AS200 Border Gateway", ipAddress: "192.0.2.20" },
        { id: "AS300-GW", type: "Core Router", name: "ISP AS300 Border Gateway", ipAddress: "192.0.2.30" },
        { id: "ROUTE-SRV", type: "Server", name: "IXP BGP Route Server", ipAddress: "192.0.2.254" },
        { id: "GLOBAL-CDN", type: "Server", name: "IXP Anycast CDN Node", ipAddress: "192.0.2.100" },
        { id: "ROOT-DNS", type: "DNS Server", name: "IXP Hosted Root DNS Server", ipAddress: "192.0.2.200" }
      ],
      connections: [
        { from: "IXP-FABRIC", to: "AS100-GW", interface: "100G-Port1" },
        { from: "IXP-FABRIC", to: "AS200-GW", interface: "100G-Port2" },
        { from: "IXP-FABRIC", to: "AS300-GW", interface: "100G-Port3" },
        { from: "IXP-FABRIC", to: "ROUTE-SRV", interface: "10G-Port24" },
        { from: "IXP-FABRIC", to: "GLOBAL-CDN", interface: "40G-Port10" },
        { from: "IXP-FABRIC", to: "ROOT-DNS", interface: "10G-Port20" }
      ]
    }
  },
  {
    name: "🖥️ Lab",
    desc: "Real 10-router FRR lab — iBGP AS 65001, OSPF area 0, live Node Exporter telemetry.",
    icon: "🖥️",
    data: {
      topologyName: "FRR Homelab — iBGP + OSPF Lab (Live Telemetry)",
      mode: "Structured",
      reasoning: "Real homelab topology running 10 FRR containers on Docker. All routers participate in OSPF Area 0 over a shared segment (172.20.0.0/16). R1 (loopback 1.1.1.1) acts as the iBGP Route Reflector for AS 65001 — all other routers (r2–r10) peer only with R1. A secondary segment (172.19.0.0/16) connects R1, R4, R5, R7, R8, R9, R10. Interface names (eth0, eth1) map directly to live Node Exporter metrics flowing from Prometheus.",
      devices: [
        { id: "r1",  type: "Core Router", name: "R1 — Route Reflector", ipAddress: "1.1.1.1" },
        { id: "r2",  type: "Router",      name: "R2",                   ipAddress: "2.2.2.2" },
        { id: "r3",  type: "Router",      name: "R3",                   ipAddress: "3.3.3.3" },
        { id: "r4",  type: "Router",      name: "R4",                   ipAddress: "4.4.4.4" },
        { id: "r5",  type: "Router",      name: "R5",                   ipAddress: "5.5.5.5" },
        { id: "r6",  type: "Router",      name: "R6",                   ipAddress: "6.6.6.6" },
        { id: "r7",  type: "Router",      name: "R7",                   ipAddress: "7.7.7.7" },
        { id: "r8",  type: "Router",      name: "R8",                   ipAddress: "8.8.8.8" },
        { id: "r9",  type: "Router",      name: "R9",                   ipAddress: "9.9.9.9" },
        { id: "r10", type: "Router",      name: "R10",                  ipAddress: "10.10.10.10" }
      ],
      connections: [
        { from: "r1",  to: "r2",  interface: "eth0" },
        { from: "r1",  to: "r3",  interface: "eth0" },
        { from: "r1",  to: "r4",  interface: "eth0" },
        { from: "r1",  to: "r5",  interface: "eth0" },
        { from: "r1",  to: "r6",  interface: "eth0" },
        { from: "r1",  to: "r7",  interface: "eth0" },
        { from: "r1",  to: "r8",  interface: "eth0" },
        { from: "r1",  to: "r9",  interface: "eth0" },
        { from: "r1",  to: "r10", interface: "eth0" },
        { from: "r4",  to: "r5",  interface: "eth1" },
        { from: "r4",  to: "r7",  interface: "eth1" },
        { from: "r5",  to: "r8",  interface: "eth1" },
        { from: "r7",  to: "r9",  interface: "eth1" },
        { from: "r8",  to: "r10", interface: "eth1" },
        { from: "r9",  to: "r10", interface: "eth1" }
      ]
    }
  }
];

