#!/usr/bin/env python3
import sys
from collections import Counter

def noOfProducts(orders, disAmount):
    if disAmount <= 0:
        return 0
    freq = Counter(orders)
    count = 0
    for _, c in freq.items():
        if c > 0 and c % disAmount == 0:
            count += 1
    return count

def main():
    data = sys.stdin.read().strip().split()
    if not data:
        print(0)
        return
    idx = 0
    try:
        N = int(data[idx])
        idx += 1
    except Exception:
        print(0)
        return
    orders = []
    for _ in range(N):
        if idx >= len(data):
            break
        try:
            orders.append(int(data[idx]))
        except Exception:
            pass
        idx += 1
    if len(orders) < N and idx < len(data) - 1:
        extra = []
        while idx < len(data) - 1:
            try:
                extra.append(int(data[idx]))
            except Exception:
                pass
            idx += 1
        if extra:
            orders.extend(extra)
    disAmount = None
    if idx < len(data):
        try:
            disAmount = int(data[idx])
        except Exception:
            disAmount = None
    if disAmount is None:
        try:
            disAmount = int(data[-1])
        except Exception:
            disAmount = 0
    result = noOfProducts(orders, disAmount)
    print(result)

if __name__ == "__main__":
    main()