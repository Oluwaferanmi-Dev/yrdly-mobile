import re

with open('src/app/tickets.tsx', 'r') as f:
    content = f.read()

# Fix duplicates
content = content.replace("import { useAppTheme } from '../context/ThemeContext';\n\nimport { Ticket, Event } from '../types/events';\nimport { useAppTheme } from '../context/ThemeContext';", "import { Ticket, Event } from '../types/events';\nimport { useAppTheme } from '../context/ThemeContext';")

# Fix image_url / image_urls -> cover_image_url
content = re.sub(r'event\?\.image_urls\?\.\[0\] \|\| event\?\.image_url', 'event?.cover_image_url', content)
content = re.sub(r'selectedTicket\.event\?\.image_urls\?\.\[0\] \|\| selectedTicket\.event\?\.image_url', 'selectedTicket.event?.cover_image_url', content)
content = re.sub(r'event\?\.image_url', 'event?.cover_image_url', content)

# Fix event_date -> start_time
content = re.sub(r'event\?\.event_date', 'event?.start_time', content)
content = re.sub(r'event\.event_date', 'event.start_time', content)

# Fix location
content = re.sub(r'event\?\.location\?\.address', 'event?.location_address', content)
content = re.sub(r'event\?\.location\?\.state', 'event?.state', content)

# Fix price -> ticket tier price
content = re.sub(r'event\?\.price', 'item.tier?.price', content)
content = re.sub(r'selectedTicket\.event\?\.price', 'selectedTicket.tier?.price', content)

# Fix ticket token -> ticket id
content = re.sub(r'selectedTicket\.token \|\| selectedTicket\.id', 'selectedTicket.id', content)

with open('src/app/tickets.tsx', 'w') as f:
    f.write(content)

