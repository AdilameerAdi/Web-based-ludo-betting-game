# Frontend Component Structure

The frontend components have been reorganized into logical subfolders for better code organization and maintainability.

## Directory Structure

```
Frontend/src/components/
├── auth/
│   ├── Input.jsx
│   ├── LoginForm.jsx
│   └── SignUpForm.jsx
├── dashboard/
│   ├── Dashboard.jsx
│   └── UserDashboard.jsx
├── admin/
│   ├── AdminLogin.jsx
│   ├── AdminDashboard.jsx
│   └── AdminWithdrawals.jsx
├── game/
│   ├── LudoGameV2.jsx
│   ├── WaitingRoom.jsx
│   ├── CustomTableForm.jsx
│   └── DefaultTableSelection.jsx
└── payment/
    ├── AddFunds.jsx
    ├── PaymentStatus.jsx
    └── WithdrawFunds.jsx
```

## Component Categories

### Auth Components (`auth/`)
- **Input.jsx**: Reusable input component for forms
- **LoginForm.jsx**: User login form
- **SignUpForm.jsx**: User registration form

### Dashboard Components (`dashboard/`)
- **Dashboard.jsx**: Main dashboard with login/signup toggle
- **UserDashboard.jsx**: User dashboard with game options and balance

### Admin Components (`admin/`)
- **AdminLogin.jsx**: Admin authentication
- **AdminDashboard.jsx**: Admin control panel
- **AdminWithdrawals.jsx**: Withdrawal management for admins

### Game Components (`game/`)
- **LudoGameV2.jsx**: Main game component with server-authoritative engine
- **WaitingRoom.jsx**: Waiting room for custom tables
- **CustomTableForm.jsx**: Form to create custom betting tables
- **DefaultTableSelection.jsx**: Selection screen for default tables

### Payment Components (`payment/`)
- **AddFunds.jsx**: Add funds to wallet via Paytm
- **PaymentStatus.jsx**: Display payment success/failure status
- **WithdrawFunds.jsx**: Withdrawal request form and history

## Import Paths

All imports have been updated to use relative paths from the new structure:

- Components in subfolders use `../../utils/api` for utilities
- Components importing from other subfolders use relative paths like `../game/ComponentName`
- Main App.jsx imports from `./components/dashboard/Dashboard`

## Benefits

1. **Better Organization**: Related components are grouped together
2. **Easier Navigation**: Clear folder structure makes finding components easier
3. **Scalability**: Easy to add new components in appropriate folders
4. **Maintainability**: Clear separation of concerns
5. **Team Collaboration**: Multiple developers can work on different areas without conflicts

## Migration Notes

- All import paths have been updated
- No logic or functionality has been changed
- All components maintain their original behavior
- The reorganization is purely structural

