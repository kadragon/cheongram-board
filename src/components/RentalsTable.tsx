"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "./ui/button";

export function RentalsTable() {
  const supabase = createClient();
  const [rentals, setRentals] = useState<any[]>([]);

  async function fetchRentals() {
    const { data } = await supabase.from("rentals").select("*, games(name)");
    if (data) {
      setRentals(data);
    }
  }

  useEffect(() => {
    fetchRentals();
  }, []);

  const handleExtend = async (id: number) => {
    await supabase.rpc('extend_rental', { rental_id: id });
    fetchRentals();
  };

  const handleReturn = async (id: number) => {
    await supabase.from("rentals").update({ returned_at: new Date().toISOString() }).eq("id", id);
    fetchRentals();
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["ID", "Game", "Rented At", "Due Date", "Returned At"].join(",") + "\n"
      + rentals.map(e => [e.id, e.games.name, e.rented_at, e.due_date, e.returned_at].join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "rentals.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleExport}>Export to CSV</Button>
      </div>
      <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Game</th>
            <th className="py-2 px-4 border-b">Rented At</th>
            <th className="py-2 px-4 border-b">Due Date</th>
            <th className="py-2 px-4 border-b">Returned At</th>
            <th className="py-2 px-4 border-b">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((rental) => (
            <tr key={rental.id}>
              <td className="py-2 px-4 border-b">{rental.games.name}</td>
              <td className="py-2 px-4 border-b">{new Date(rental.rented_at).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b">{new Date(rental.due_date).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b">{rental.returned_at ? new Date(rental.returned_at).toLocaleDateString() : ""}</td>
              <td className="py-2 px-4 border-b">
                {!rental.returned_at && (
                  <>
                    <Button variant="outline" size="sm" className="mr-2" onClick={() => handleExtend(rental.id)}>Extend</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleReturn(rental.id)}>Return</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}