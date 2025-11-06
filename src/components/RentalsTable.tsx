"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { RentalForm } from "./RentalForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function RentalsTable() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchRentals() {
    try {
      const response = await fetch("/api/rentals");
      if (response.ok) {
        const result = await response.json();
        setRentals(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch rentals:", error);
    }
  }

  useEffect(() => {
    fetchRentals();
  }, []);

  const handleExtend = async (id: number) => {
    try {
      const response = await fetch(`/api/rentals/${id}/extend`, {
        method: "POST",
      });
      if (response.ok) {
        fetchRentals();
      } else {
        const error = await response.json();
        alert(`Failed to extend rental: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to extend rental:", error);
      alert("Failed to extend rental");
    }
  };

  const handleReturn = async (id: number) => {
    try {
      const response = await fetch(`/api/rentals/${id}/return`, {
        method: "POST",
      });
      if (response.ok) {
        fetchRentals();
      } else {
        const error = await response.json();
        alert(`Failed to return rental: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Failed to return rental:", error);
      alert("Failed to return rental");
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["ID", "Game", "Renter", "Rented At", "Due Date", "Returned At"].join(",") + "\n"
      + rentals.map(e => [
          e.id,
          `"${e.games?.title || 'Unknown'}"`,
          `"${e.name}"`,
          e.rented_at,
          e.due_date,
          e.returned_at || ''
        ].join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "rentals.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    const { renter_name, rental_date, game_id } = formData;

    const response = await fetch('/api/rentals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: renter_name,
        game_id: parseInt(game_id),
        rented_at: rental_date,
        due_date: new Date(new Date(rental_date).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }),
    });

    if (response.ok) {
      fetchRentals();
      setIsDialogOpen(false);
    } else {
      const result = await response.json();
      alert(`Error: ${result.error || 'Unknown error'}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Rental</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Rental</DialogTitle>
            </DialogHeader>
            <RentalForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </DialogContent>
        </Dialog>
        <Button onClick={handleExport} className="ml-2">Export to CSV</Button>
      </div>
      <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">게임</th>
            <th className="py-2 px-4 border-b text-center">대여자</th>
            <th className="py-2 px-4 border-b text-center">대여일</th>
            <th className="py-2 px-4 border-b text-center">반납 예정일</th>
            <th className="py-2 px-4 border-b text-center">반납일</th>
            <th className="py-2 px-4 border-b text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map((rental) => (
            <tr key={rental.id}>
              <td className="py-2 px-4 border-b">{rental.games?.title || 'Unknown'}</td>
              <td className="py-2 px-4 border-b text-center">{rental.name}</td>
              <td className="py-2 px-4 border-b text-center">{new Date(rental.rented_at).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b text-center">{new Date(rental.due_date).toLocaleDateString()}</td>
              <td className="py-2 px-4 border-b text-center">{rental.returned_at ? new Date(rental.returned_at).toLocaleDateString() : ""}</td>
              <td className="py-2 px-4 border-b text-center">
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
    </div>
  );
}
