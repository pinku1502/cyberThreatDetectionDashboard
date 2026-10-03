from scapy.all import sniff, IP, IPv6, TCP, UDP
import time
import requests


# ============================================================
# CONFIGURATION
# ============================================================

FLASK_API = "http://127.0.0.1:8000/predict"
NODE_API = "http://localhost:5000/api/predict"

DISPLAY_AFTER_PACKETS = 5

flows = {}


# ============================================================
# MODEL FEATURE ORDER
# ============================================================

FEATURE_NAMES = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Mean",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "Average Packet Size",
    "Idle Mean",
    "Active Mean"
]


# ============================================================
# GET PACKET INFORMATION
# ============================================================

def get_packet_info(packet):

    if IP in packet:
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst

    elif IPv6 in packet:
        src_ip = packet[IPv6].src
        dst_ip = packet[IPv6].dst

    else:
        return None

    protocol = "OTHER"
    src_port = 0
    dst_port = 0

    if TCP in packet:
        protocol = "TCP"
        src_port = packet[TCP].sport
        dst_port = packet[TCP].dport

    elif UDP in packet:
        protocol = "UDP"
        src_port = packet[UDP].sport
        dst_port = packet[UDP].dport

    else:
        return None

    return {
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "protocol": protocol
    }


# ============================================================
# FLOW KEY
# ============================================================

def get_flow_key(packet_info):

    forward = (
        packet_info["src_ip"],
        packet_info["src_port"],
        packet_info["dst_ip"],
        packet_info["dst_port"],
        packet_info["protocol"]
    )

    backward = (
        packet_info["dst_ip"],
        packet_info["dst_port"],
        packet_info["src_ip"],
        packet_info["src_port"],
        packet_info["protocol"]
    )

    if forward in flows:
        return forward, True

    if backward in flows:
        return backward, False

    return forward, True


# ============================================================
# CREATE FLOW
# ============================================================

def create_flow(packet, packet_info):

    timestamp = float(packet.time)

    return {
        "src_ip": packet_info["src_ip"],
        "dst_ip": packet_info["dst_ip"],
        "src_port": packet_info["src_port"],
        "dst_port": packet_info["dst_port"],
        "protocol": packet_info["protocol"],

        "start_time": timestamp,
        "last_time": timestamp,

        "forward_packets": 0,
        "backward_packets": 0,

        "forward_bytes": 0,
        "backward_bytes": 0,

        "forward_lengths": [],
        "backward_lengths": [],

        "fin": 0,
        "syn": 0,
        "rst": 0,
        "psh": 0,
        "ack": 0,
        "urg": 0,

        "packet_times": []
    }


# ============================================================
# UPDATE FLOW
# ============================================================

def update_flow(flow, packet, packet_info, is_forward):

    timestamp = float(packet.time)
    packet_length = len(packet)

    flow["last_time"] = timestamp
    flow["packet_times"].append(timestamp)

    if is_forward:

        flow["forward_packets"] += 1
        flow["forward_bytes"] += packet_length
        flow["forward_lengths"].append(packet_length)

    else:

        flow["backward_packets"] += 1
        flow["backward_bytes"] += packet_length
        flow["backward_lengths"].append(packet_length)

    # ========================================================
    # TCP FLAGS
    # ========================================================

    if TCP in packet:

        flags = packet[TCP].flags

        if flags.F:
            flow["fin"] += 1

        if flags.S:
            flow["syn"] += 1

        if flags.R:
            flow["rst"] += 1

        if flags.P:
            flow["psh"] += 1

        if flags.A:
            flow["ack"] += 1

        if flags.U:
            flow["urg"] += 1


# ============================================================
# ACTIVITY CALCULATION
# ============================================================

def calculate_activity(flow):

    times = sorted(flow["packet_times"])

    if len(times) < 2:
        return 0.0, 0.0

    active_periods = []
    idle_periods = []

    active_start = times[0]
    previous = times[0]

    for current in times[1:]:

        gap = current - previous

        if gap > 1.0:

            active_periods.append(previous - active_start)
            idle_periods.append(gap)

            active_start = current

        previous = current

    active_periods.append(previous - active_start)

    active_mean = (
        sum(active_periods) / len(active_periods)
        if active_periods
        else 0.0
    )

    idle_mean = (
        sum(idle_periods) / len(idle_periods)
        if idle_periods
        else 0.0
    )

    return active_mean, idle_mean


# ============================================================
# GENERATE 19 MODEL FEATURES
# ============================================================

def generate_features(flow):

    start = flow["start_time"]
    end = flow["last_time"]

    duration_seconds = max(end - start, 0.000001)

    duration_microseconds = duration_seconds * 1_000_000

    total_packets = (
        flow["forward_packets"]
        + flow["backward_packets"]
    )

    total_bytes = (
        flow["forward_bytes"]
        + flow["backward_bytes"]
    )

    forward_mean = (
        sum(flow["forward_lengths"])
        / len(flow["forward_lengths"])
        if flow["forward_lengths"]
        else 0.0
    )

    backward_mean = (
        sum(flow["backward_lengths"])
        / len(flow["backward_lengths"])
        if flow["backward_lengths"]
        else 0.0
    )

    flow_bytes_per_second = (
        total_bytes / duration_seconds
        if duration_seconds > 0
        else 0.0
    )

    flow_packets_per_second = (
        total_packets / duration_seconds
        if duration_seconds > 0
        else 0.0
    )

    average_packet_size = (
        total_bytes / total_packets
        if total_packets > 0
        else 0.0
    )

    active_mean_seconds, idle_mean_seconds = calculate_activity(flow)

    features = {

        "Destination Port":
            flow["dst_port"],

        "Flow Duration":
            duration_microseconds,

        "Total Fwd Packets":
            flow["forward_packets"],

        "Total Backward Packets":
            flow["backward_packets"],

        "Total Length of Fwd Packets":
            flow["forward_bytes"],

        "Total Length of Bwd Packets":
            flow["backward_bytes"],

        "Flow Bytes/s":
            flow_bytes_per_second,

        "Flow Packets/s":
            flow_packets_per_second,

        "Fwd Packet Length Mean":
            forward_mean,

        "Bwd Packet Length Mean":
            backward_mean,

        "FIN Flag Count":
            flow["fin"],

        "SYN Flag Count":
            flow["syn"],

        "RST Flag Count":
            flow["rst"],

        "PSH Flag Count":
            flow["psh"],

        "ACK Flag Count":
            flow["ack"],

        "URG Flag Count":
            flow["urg"],

        "Average Packet Size":
            average_packet_size,

        "Idle Mean":
            idle_mean_seconds * 1_000_000,

        "Active Mean":
            active_mean_seconds * 1_000_000
    }

    return features


# ============================================================
# SEND FEATURES TO FLASK
# ============================================================

def predict_with_flask(features):

    try:

        response = requests.post(
            FLASK_API,
            json=features,
            timeout=10
        )

        if response.status_code == 200:

            return response.json()

        print("\nFlask API Error")
        print("Status Code:", response.status_code)
        print("Response:", response.text)

        return None

    except requests.exceptions.ConnectionError:

        print("\nFlask Connection Error")
        print("Make sure Flask API is running on:")
        print(FLASK_API)

        return None

    except requests.exceptions.Timeout:

        print("\nFlask Request Timeout")

        return None

    except Exception as e:

        print("\nPrediction Error:", e)

        return None


# ============================================================
# SEND FEATURES TO NODE + MYSQL
# ============================================================

def save_to_database(features):

    try:

        response = requests.post(
            NODE_API,
            json=features,
            timeout=10
        )

        print()
        print("-" * 75)
        print("DATABASE LOGGING")
        print("-" * 75)

        print("Node Status Code:", response.status_code)

        if response.status_code == 200:

            try:

                result = response.json()

                print("DATABASE LOGGED")

                if result.get("data"):
                    print(
                        "Database ID:",
                        result["data"].get("id")
                    )

                    print(
                        "Attack Name:",
                        result["data"].get("attack_name")
                    )

                    print(
                        "Confidence:",
                        result["data"].get("confidence")
                    )

            except Exception:

                print("Node Response:", response.text)

        else:

            print("DATABASE LOGGING FAILED")
            print("Response:", response.text)

        print("-" * 75)

    except requests.exceptions.ConnectionError:

        print()
        print("NODE CONNECTION ERROR")
        print("Make sure Node backend is running on:")
        print(NODE_API)

    except requests.exceptions.Timeout:

        print()
        print("NODE REQUEST TIMEOUT")

    except Exception as e:

        print()
        print("DATABASE ERROR:", e)


# ============================================================
# SEND FLOW TO AI + DATABASE
# ============================================================

def send_to_flask(features):

    # --------------------------------------------------------
    # STEP 1: FLASK AI PREDICTION
    # --------------------------------------------------------

    result = predict_with_flask(features)

    if result is None:
        return

    print("\n")
    print("=" * 75)
    print("AI PREDICTION")
    print("=" * 75)

    print("Attack Name :", result.get("attack_name"))
    print("Prediction  :", result.get("prediction"))
    print("Confidence  :", result.get("confidence"))
    print("Severity    :", result.get("severity"))
    print("Model Used  :", result.get("model_used"))

    print(
        "RF Prediction  :",
        result.get("rf_attack_name")
    )

    print(
        "RF Confidence  :",
        result.get("rf_confidence")
    )

    print(
        "XGB Prediction :",
        result.get("xgb_attack_name")
    )

    print(
        "XGB Confidence :",
        result.get("xgb_confidence")
    )

    print(
        "Models Agree   :",
        result.get("models_agree")
    )

    print("=" * 75)

    # --------------------------------------------------------
    # STEP 2: SEND SAME FEATURES TO NODE
    # NODE WILL CALL FLASK AND SAVE RESULT TO MYSQL
    # --------------------------------------------------------

    save_to_database(features)


# ============================================================
# PRINT FLOW
# ============================================================

def print_flow(flow):

    print("\n")
    print("=" * 75)

    print(
        f"FLOW: "
        f"{flow['src_ip']}:{flow['src_port']} "
        f"-> "
        f"{flow['dst_ip']}:{flow['dst_port']}"
    )

    print("Protocol:", flow["protocol"])

    print(
        "Packets:",
        flow["forward_packets"]
        + flow["backward_packets"]
    )

    print()

    features = generate_features(flow)

    print("19 MODEL FEATURES:")
    print("-" * 75)

    for name in FEATURE_NAMES:

        print(
            f"{name}: {features[name]}"
        )

    print("=" * 75)

    # SEND TO FLASK + NODE/MYSQL

    send_to_flask(features)


# ============================================================
# PROCESS PACKET
# ============================================================

def process_packet(packet):

    packet_info = get_packet_info(packet)

    if packet_info is None:
        return

    flow_key, is_forward = get_flow_key(packet_info)

    if flow_key not in flows:

        flows[flow_key] = create_flow(
            packet,
            packet_info
        )

    flow = flows[flow_key]

    update_flow(
        flow,
        packet,
        packet_info,
        is_forward
    )

    total_packets = (
        flow["forward_packets"]
        + flow["backward_packets"]
    )

    # --------------------------------------------------------
    # DISPLAY AFTER EVERY 5 PACKETS
    # --------------------------------------------------------

    if total_packets == DISPLAY_AFTER_PACKETS:

        print_flow(flow)


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 75)
    print("CYBER THREAT DETECTION")
    print("LIVE NETWORK TRAFFIC COLLECTOR")
    print("=" * 75)

    print()

    print("Flask API:")
    print(FLASK_API)

    print()

    print("Node API:")
    print(NODE_API)

    print()

    print("Listening for live network traffic...")
    print("A flow will be displayed after 5 packets.")
    print("Press CTRL+C to stop.")
    print()

    sniff(
        prn=process_packet,
        store=False
    )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":
    main()