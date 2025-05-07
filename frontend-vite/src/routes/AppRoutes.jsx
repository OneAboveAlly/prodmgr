// Inventory routes
{
  path: "inventory",
  children: [
    {
      path: "",
      element: <InventoryPage />,
      meta: { requiresAuth: true, permissions: { module: "inventory", action: "read" } }
    },
    {
      path: "items/:id",
      element: <InventoryItemDetails />,
      meta: { requiresAuth: true, permissions: { module: "inventory", action: "read" } }
    },
    {
      path: "items/edit/:id",
      element: <InventoryEditPage />,
      meta: { requiresAuth: true, permissions: { module: "inventory", action: "update", level: 1 } }
    },
    {
      path: "transactions",
      element: <TransactionHistoryPage />,
      meta: { requiresAuth: true, permissions: { module: "inventory", action: "manage", level: 1 } }
    },
    {
      path: "report",
      element: <InventoryReportPage />,
      meta: { requiresAuth: true, permissions: { module: "inventory", action: "read", level: 2 } }
    }
  ]
}, 