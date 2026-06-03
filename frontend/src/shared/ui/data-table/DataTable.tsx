import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableProps<T> = {
  title?: string;
  description?: string;
  data: T[];
  columns: ColumnDef<T, unknown>[];
  emptyLabel?: string;
  className?: string;
};

/** TanStack Table requires `id` when header is not a plain string. */
function normalizeColumns<T>(columns: ColumnDef<T, unknown>[]): ColumnDef<T, unknown>[] {
  return columns.map((col, index) => {
    const def = col as ColumnDef<T, unknown> & { accessorKey?: string; id?: string };
    if (def.id) return col;

    if (typeof def.accessorKey === "string" && def.accessorKey) {
      return { ...col, id: def.accessorKey };
    }

    if (typeof def.header === "string" && def.header.trim()) {
      return {
        ...col,
        id: def.header
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
      };
    }

    return { ...col, id: `col-${index}` };
  });
}

/**
 * Enterprise-style data table — TanStack Table + shadcn primitives + premium card shell.
 */
export function DataTable<T>({
  title,
  description,
  data,
  columns,
  emptyLabel = "No records yet.",
  className,
}: DataTableProps<T>) {
  const safeColumns = normalizeColumns(columns);

  const table = useReactTable({
    data,
    columns: safeColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className={cn("border-border/80 shadow-card", className)}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title ? <CardTitle className="text-base font-semibold">{title}</CardTitle> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </CardHeader>
      )}
      <CardContent className="p-0 sm:p-0">
        {data.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
