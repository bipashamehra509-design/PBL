SMART CANTEEN - SQLITE VERSION

No MySQL installation, password, or Workbench is needed.
The local database file (canteen.db) is created automatically on first start.

SETUP:
1. Extract this ZIP.
2. Open the extracted smartcanteen folder in VS Code.
3. Open Terminal > New Terminal.
4. Run: npm install
5. Run: npm start
6. Open: http://localhost:3000

The project includes:
- Customer food ordering
- Automatic stock reduction after an order
- Order search and status filters
- Order status updates
- Admin dashboard and sales summary
- Inventory add/update and low-stock alerts

DATA:
Orders and inventory are saved in canteen.db in this folder.
Keep that file if you want to keep your data. Back it up before moving the project.

PRIORITY QUEUE:
- Customers can select Normal, High, or Urgent when placing an order.
- The Orders page sorts Urgent first, then High, then Normal (oldest first within each priority).
- Orders page can filter by priority.
- Existing canteen.db files are upgraded automatically; existing orders default to Normal.
