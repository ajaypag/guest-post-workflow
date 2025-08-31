# Pricing Standardization Notes

## Goals
- Standardize everything to integer on the backend for consistency
- Create admin panel to make pricing moldable instead of hardcoded $79
- Examples of flexibility needed:
  - Certain accounts have certain markups
  - Fee decreases based on order size
  - Fee decreases based on money spent in previous month
  - Need options

## Changes Needed
- Clean up non-used pricing stuff that's confusing the system
- Connect things properly in the system
- Move away from "guest_post_cost" 
- Lean more into publisher offering relationship
- Make publisher offerings uneditable after they're established so pricing doesn't get messy randomly

## Scope/Impact
- guest_post_cost is connected across entire app:
  - Orders
  - Bulk analysis
  - Vetted sites
  - All claim pages
  - Invoices
  - Everything really - total cluster fuck

## Notes
- Huge undertaking but better to do now than later
- Clean break from guest_post_cost to correct offering connection could be good form
- This will not be for the faint of heart but we need to do it