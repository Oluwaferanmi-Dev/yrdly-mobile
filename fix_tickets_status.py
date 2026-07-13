import re

with open('src/app/tickets.tsx', 'r') as f:
    content = f.read()

# Fix status comparisons
content = content.replace("ticket.status === 'active' || ticket.status === 'confirmed'", "ticket.status === 'PAID'")
content = content.replace("ticket.status === 'confirmed' ? 'CONFIRMED' : 'ACTIVE'", "'PAID'")
content = content.replace("t.status === 'used'", "t.status === 'USED'")
content = content.replace("t.status === 'cancelled'", "t.status === 'CANCELLED'")
content = content.replace("t.status === 'refunded'", "t.status === 'REFUNDED'")

with open('src/app/tickets.tsx', 'w') as f:
    f.write(content)

