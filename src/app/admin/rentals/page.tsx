import { RentalsTable } from "@/components/RentalsTable";

export default function AdminRentalsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Rental Management</h1>
      <RentalsTable />
    </div>
  );
}