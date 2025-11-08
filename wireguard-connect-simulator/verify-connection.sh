#!/bin/bash
# Script to verify WireGuard connection is working

echo "=== Checking WireGuard Interfaces ==="
echo "wg0 status:"
ip link show wg0 2>/dev/null || echo "  wg0 not found"
echo ""
echo "wg1 status:"
ip link show wg1 2>/dev/null || echo "  wg1 not found"

echo ""
echo "=== WireGuard IP Addresses ==="
ip addr show wg0 2>/dev/null | grep "inet " || echo "  wg0 has no IP"
ip addr show wg1 2>/dev/null | grep "inet " || echo "  wg1 has no IP"

echo ""
echo "=== Routing Table (WireGuard related) ==="
ip route show | grep -E "10.0.8|wg" || echo "  No WireGuard routes"

echo ""
echo "=== Testing Connectivity ==="
echo "Pinging 10.0.8.2 from wg0:"
ping -c 2 -I wg0 10.0.8.2 2>&1 | tail -3 || echo "  Ping failed"

echo ""
echo "Pinging 10.0.8.1 from wg1:"
ping -c 2 -I wg1 10.0.8.1 2>&1 | tail -3 || echo "  Ping failed"

echo ""
echo "=== Current Traffic Stats ==="
cat /proc/net/dev | grep -E "wg0|wg1"

echo ""
echo "=== WireGuard Status (requires sudo) ==="
sudo wg show 2>/dev/null || echo "  Cannot run wg show (sudo issue)"

