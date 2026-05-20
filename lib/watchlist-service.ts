import {
  AddInstrumentRequest,
  CalibrationRequest,
  CreateWatchlistRequest,
  InstrumentCalibrationResponse,
  UpdateWatchlistRequest,
  Watchlist,
} from "./watchlist-types";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "Request failed";

    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch (_) {}

    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Fetch all ACTIVE watchlists
 */
export async function getWatchlists(
  clientId: string
): Promise<Watchlist[]> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  return handleResponse<Watchlist[]>(response);
}

/**
 * Fetch all watchlists including archived
 */
export async function getAllWatchlists(
  clientId: string
): Promise<Watchlist[]> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/all`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  return handleResponse<Watchlist[]>(response);
}

/**
 * Fetch one watchlist
 */
export async function getWatchlist(
  clientId: string,
  watchlistId: string
): Promise<Watchlist> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  return handleResponse<Watchlist>(response);
}

/**
 * Create watchlist
 */
export async function createWatchlist(
  clientId: string,
  payload: {
    name: string;
  }
): Promise<Watchlist> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(payload),
    }
  );

  return handleResponse(response);
}

/**
 * Update watchlist
 */
export async function updateWatchlist(
  clientId: string,
  watchlistId: string,
  payload: UpdateWatchlistRequest
): Promise<Watchlist> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  return handleResponse<Watchlist>(response);
}

/**
 * Archive watchlist
 */
export async function archiveWatchlist(
  clientId: string,
  watchlistId: string
): Promise<Watchlist> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}/archive`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return handleResponse<Watchlist>(response);
}

/** Rename watchlist
 */

export async function renameWatchlist(
  clientId: string,
  watchlistId: string,
  payload: {
    name: string;
  }
): Promise<Watchlist> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(payload),
    }
  );

  return handleResponse(response);
}

/**
 * Delete watchlist
 */
export async function deleteWatchlist(
  clientId: string,
  watchlistId: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}`,
    {
      method: "DELETE",
    }
  );

  await handleResponse(response);
}
/**
 * Add instrument
 */
export async function addInstrument(
  clientId: string,
  watchlistId: string,
  payload: AddInstrumentRequest
): Promise<Watchlist> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}/instruments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  return handleResponse<Watchlist>(response);
}

/**
 * Remove instrument
 */
export async function removeInstrument(
  clientId: string,
  watchlistId: string,
  instrumentKey: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}/instruments/${encodeURIComponent(
      instrumentKey
    )}`,
    {
      method: "DELETE",
    }
  );

  await handleResponse(response);
}

/**
 * Set calibration state
 */
export async function setCalibration(
  clientId: string,
  watchlistId: string,
  instrumentKey: string,
  payload: CalibrationRequest
): Promise<InstrumentCalibrationResponse> {
  const response = await fetch(
    `${BASE_URL}/api/clients/${clientId}/watchlists/${watchlistId}/instruments/${encodeURIComponent(
      instrumentKey
    )}/calibration`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  return handleResponse<InstrumentCalibrationResponse>(response);
}