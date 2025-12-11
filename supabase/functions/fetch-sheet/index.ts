import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHEET_ID = '1h_Azjp-jQK0GArWWOcVm5jlk3416wZeO_x9ATBfR32g';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Google Sheet for user:', userEmail);

    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      console.error('Failed to fetch sheet:', response.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch Google Sheet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const csvText = await response.text();
    const lines = csvText.split('\n');
    
    // Parse CSV - first line is header
    const headers = parseCSVLine(lines[0]);
    console.log('Headers:', headers);
    
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Filter by email (first column is 電郵)
      const rowEmail = row['電郵'] || row['email'] || values[0];
      if (rowEmail && rowEmail.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
        data.push({
          email: rowEmail,
          ig_account: row['IG Account'] || values[1] || '',
          subject: row['主題'] || values[2] || '',
          keyword: row['Keyword'] || values[3] || '',
          title: row['標題'] || values[4] || '',
          ig_link: row['IG Link'] || values[5] || '',
        });
      }
    }

    console.log('Found', data.length, 'rows for user');

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
