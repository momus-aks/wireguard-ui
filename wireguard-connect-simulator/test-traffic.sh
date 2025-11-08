#!/bin/bash
# Test script to verify WireGuard traffic is being tracked

echo "=== WireGuard Interface Status ==="
ip link show | grep -E "wg0|wg1" || echo "No WireGuard interfaces found"

echo ""
echo "=== WireGuard Stats (requires sudo) ==="
sudo wg show 2>/dev/null || echo "Cannot run wg show (sudo issue or no interfaces)"

echo ""
echo "=== /proc/net/dev Stats (no sudo needed) ==="
cat /proc/net/dev | grep -E "wg0|wg1"

echo ""
echo "=== Testing Connectivity ==="
echo "Can you ping 10.0.8.1 from 10.0.8.2? (run: ping 10.0.8.1)"
echo "Can you ping 10.0.8.2 from 10.0.8.1? (run: ping 10.0.8.2)"

echo ""
echo "=== iperf Test ==="
echo "To test with iperf:"
echo "  Terminal 1: iperf3 -s -B 10.0.8.1"
echo "  Terminal 2: iperf3 -c 10.0.8.1 -B 10.0.8.2 -t 10"
echo ""
echo "While iperf runs, check:"
echo "  watch -n 1 'cat /proc/net/dev | grep wg'"

