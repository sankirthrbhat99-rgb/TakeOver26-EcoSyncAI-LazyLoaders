from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import asyncio
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ----- Config -----
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

REORDER_QUANTITY_DEFAULT = 100

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ecosync")

# ----- DB -----
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ----- App / Router -----
app = FastAPI(title="EcoSync AI")
api = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Utils -----
def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ----- Models -----
class LoginIn(BaseModel):
    email: EmailStr
    password: str

class InventoryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_name: str
    current_stock: int
    safety_threshold: int
    unit: str = "units"
    component_type: str  # matches suppliers.component_type
    reorder_quantity: int = REORDER_QUANTITY_DEFAULT

class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    component_type: str
    price_per_unit: float
    carbon_score: int  # 1..100 lower better
    lead_time_days: int
    contact_email: EmailStr

class AgentLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=utcnow_iso)
    agent_name: str  # Demand Forecaster | Eco-Scout | Procurement Agent | System
    message: str
    current_status: str  # thinking | executing | completed

class PurchaseOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    inventory_id: str
    inventory_name: str
    supplier_id: str
    supplier_name: str
    supplier_email: str
    quantity: int
    unit_price: float
    total_price: float
    carbon_score: int
    lead_time_days: int
    rfq_email_body: str
    status: str = "pending_review"  # pending_review | approved
    created_at: str = Field(default_factory=utcnow_iso)
    approved_at: Optional[str] = None
    carbon_saved_kg: float = 0.0  # vs worst supplier for same component

# ----- Log helper -----
async def add_log(agent_name: str, message: str, status: str):
    log = AgentLog(agent_name=agent_name, message=message, current_status=status)
    await db.agent_logs.insert_one(log.model_dump())
    logger.info(f"[{agent_name}] ({status}) {message}")

# ----- LLM: RFQ Email drafter -----
async def draft_rfq_email(supplier: dict, item: dict, quantity: int) -> str:
    fallback = (
        f"Subject: Request for Quotation - {item['item_name']} ({quantity} {item.get('unit','units')})\n\n"
        f"Dear {supplier['name']} Team,\n\n"
        f"I hope this message finds you well. EcoSync AI, on behalf of our client, is preparing "
        f"a procurement order for the following item and would appreciate your formal quotation.\n\n"
        f"Item: {item['item_name']}\n"
        f"Component Type: {item['component_type']}\n"
        f"Requested Quantity: {quantity} {item.get('unit','units')}\n"
        f"Indicative Unit Price (from your catalogue): ${supplier['price_per_unit']:.2f}\n"
        f"Expected Lead Time: {supplier['lead_time_days']} days\n\n"
        f"We selected your firm because your carbon score of {supplier['carbon_score']}/100 aligns with "
        f"our sustainable sourcing mandate. Kindly confirm availability, current pricing, delivery timelines, "
        f"and any volume discounts.\n\n"
        f"Please reply to this email at your earliest convenience.\n\n"
        f"Best regards,\n"
        f"Procurement Desk\n"
        f"EcoSync AI"
    )
    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"rfq-{uuid.uuid4()}",
            system_message=(
                "You are the Procurement Agent for EcoSync AI, a supply chain platform for manufacturing SMEs. "
                "Draft concise, professional Request-for-Quotation (RFQ) emails. "
                "Tone: formal, warm, business-grade. Output plain text only (no markdown). "
                "Always include a Subject line, salutation, item details, sustainability rationale, "
                "and a clear call to action for pricing/lead-time confirmation."
            ),
        ).with_model("anthropic", "claude-sonnet-4-6")
        prompt = (
            f"Draft an RFQ email with the following details:\n"
            f"- Supplier: {supplier['name']} (contact: {supplier['contact_email']})\n"
            f"- Item: {item['item_name']} ({item['component_type']})\n"
            f"- Quantity: {quantity} {item.get('unit','units')}\n"
            f"- Supplier catalogue price: ${supplier['price_per_unit']:.2f} / unit\n"
            f"- Supplier lead time: {supplier['lead_time_days']} days\n"
            f"- Supplier carbon score (lower is better): {supplier['carbon_score']}/100\n"
            f"Mention that the supplier was selected for its balance of cost efficiency "
            f"and low carbon footprint. Keep it under 180 words."
        )
        reply = await chat.send_message(UserMessage(text=prompt))
        text = (reply or "").strip()
        return text if text else fallback
    except Exception as e:
        logger.warning(f"LLM RFQ drafting failed, using fallback: {e}")
        return fallback

# ----- Agent loop -----
async def run_agent_loop(inventory_id: str):
    """Multi-agent chain triggered when stock <= safety_threshold."""
    item = await db.inventory.find_one({"id": inventory_id}, {"_id": 0})
    if not item:
        return

    # Guard: skip if already has a pending PO
    existing = await db.purchase_orders.find_one({
        "inventory_id": inventory_id, "status": "pending_review"
    })
    if existing:
        await add_log("System", f"Reorder loop skipped for {item['item_name']} - pending RFQ already awaiting approval.", "completed")
        return

    # Demand Forecaster
    deficit = item['safety_threshold'] - item['current_stock']
    await add_log("Demand Forecaster", f"Analyzing stock deficit for {item['item_name']}...", "thinking")
    await asyncio.sleep(0.6)
    await add_log(
        "Demand Forecaster",
        f"Current stock {item['current_stock']} {item['unit']} is at/below safety threshold {item['safety_threshold']} {item['unit']} (deficit {max(deficit,0)}). Recommending reorder of {item['reorder_quantity']} units.",
        "completed",
    )

    # Eco-Scout: fetch matching suppliers
    await add_log("Eco-Scout", f"Scanning supplier network for '{item['component_type']}' with best cost / carbon balance...", "thinking")
    await asyncio.sleep(0.6)
    cursor = db.suppliers.find({"component_type": item['component_type']}, {"_id": 0})
    suppliers = await cursor.to_list(500)
    if not suppliers:
        await add_log("Eco-Scout", f"No suppliers found for component type '{item['component_type']}'. Aborting.", "completed")
        return

    # Normalize price and carbon, compute weighted score (lower = better)
    prices = [s['price_per_unit'] for s in suppliers]
    carbons = [s['carbon_score'] for s in suppliers]
    p_min, p_max = min(prices), max(prices)
    c_min, c_max = min(carbons), max(carbons)
    def norm(v, lo, hi):
        return 0.0 if hi == lo else (v - lo) / (hi - lo)
    scored = []
    for s in suppliers:
        np_ = norm(s['price_per_unit'], p_min, p_max)
        nc_ = norm(s['carbon_score'], c_min, c_max)
        composite = 0.5 * np_ + 0.5 * nc_  # balanced
        scored.append({**s, "composite": round(composite, 4)})
    scored.sort(key=lambda x: x["composite"])
    top3 = scored[:3]

    ranking_txt = " | ".join(
        f"#{i+1} {s['name']} (cost ${s['price_per_unit']:.2f}, carbon {s['carbon_score']})"
        for i, s in enumerate(top3)
    )
    await add_log("Eco-Scout", f"Top 3 candidates ranked by cost+carbon balance: {ranking_txt}.", "executing")
    await asyncio.sleep(0.4)
    chosen = top3[0]
    await add_log(
        "Eco-Scout",
        f"Selected {chosen['name']} — best composite of price and low carbon footprint (carbon score {chosen['carbon_score']}/100).",
        "completed",
    )

    # Procurement Agent
    await add_log("Procurement Agent", f"Drafting RFQ email for {chosen['name']} <{chosen['contact_email']}>...", "thinking")
    email_body = await draft_rfq_email(chosen, item, item['reorder_quantity'])
    await add_log("Procurement Agent", f"Draft prepared. Awaiting human review for order to {chosen['name']}.", "executing")

    # Compute carbon saved vs worst supplier for same component (per unit CO2 kg proxy: carbon_score * 0.1)
    worst = max(suppliers, key=lambda s: s['carbon_score'])
    carbon_saved_kg = round(max(0, (worst['carbon_score'] - chosen['carbon_score'])) * 0.1 * item['reorder_quantity'], 2)

    po = PurchaseOrder(
        inventory_id=item['id'],
        inventory_name=item['item_name'],
        supplier_id=chosen['id'],
        supplier_name=chosen['name'],
        supplier_email=chosen['contact_email'],
        quantity=item['reorder_quantity'],
        unit_price=chosen['price_per_unit'],
        total_price=round(chosen['price_per_unit'] * item['reorder_quantity'], 2),
        carbon_score=chosen['carbon_score'],
        lead_time_days=chosen['lead_time_days'],
        rfq_email_body=email_body,
        carbon_saved_kg=carbon_saved_kg,
    )
    await db.purchase_orders.insert_one(po.model_dump())
    await add_log("Procurement Agent", f"RFQ draft flagged for human review (PO {po.id[:8]}).", "completed")

# ----- Auth Endpoints -----
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user['id'], user['email'])
    response.set_cookie(
        "access_token", token, httponly=True, secure=True, samesite="none",
        max_age=60 * 60 * 24, path="/",
    )
    return {"id": user['id'], "email": user['email'], "name": user.get('name'), "role": user.get('role'), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ----- Inventory Endpoints -----
@api.get("/inventory")
async def list_inventory(user: dict = Depends(get_current_user)):
    items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    return items

@api.post("/inventory/{item_id}/consume")
async def consume_inventory(item_id: str, qty: int = 10, background: BackgroundTasks = None, user: dict = Depends(get_current_user)):
    """Simulate consumption. Triggers agent loop if stock <= safety_threshold."""
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Inventory item not found")
    new_stock = max(0, item['current_stock'] - qty)
    await db.inventory.update_one({"id": item_id}, {"$set": {"current_stock": new_stock}})
    if new_stock <= item['safety_threshold']:
        background.add_task(run_agent_loop, item_id)
    return {"id": item_id, "current_stock": new_stock, "triggered_reorder": new_stock <= item['safety_threshold']}

@api.post("/inventory/{item_id}/trigger-reorder")
async def trigger_reorder(item_id: str, background: BackgroundTasks, user: dict = Depends(get_current_user)):
    item = await db.inventory.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Inventory item not found")
    background.add_task(run_agent_loop, item_id)
    return {"ok": True, "message": f"Agent loop triggered for {item['item_name']}"}

# ----- Suppliers -----
@api.get("/suppliers")
async def list_suppliers(user: dict = Depends(get_current_user)):
    items = await db.suppliers.find({}, {"_id": 0}).to_list(1000)
    return items

# ----- Agent Logs -----
@api.get("/agent-logs")
async def list_logs(limit: int = 200, user: dict = Depends(get_current_user)):
    logs = await db.agent_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return list(reversed(logs))  # oldest first for terminal append

# ----- Purchase Orders / Approvals -----
@api.get("/purchase-orders")
async def list_pos(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"status": status} if status else {}
    items = await db.purchase_orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api.post("/purchase-orders/{po_id}/approve")
async def approve_po(po_id: str, user: dict = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({"id": po_id}, {"_id": 0})
    if not po:
        raise HTTPException(404, "Purchase order not found")
    if po['status'] == "approved":
        raise HTTPException(400, "Already approved")
    approved_at = utcnow_iso()
    await db.purchase_orders.update_one(
        {"id": po_id},
        {"$set": {"status": "approved", "approved_at": approved_at}},
    )
    # Increment inventory
    await db.inventory.update_one(
        {"id": po['inventory_id']},
        {"$inc": {"current_stock": po['quantity']}},
    )
    await add_log(
        "Procurement Agent",
        f"Purchase Order Approved - Dispatching RFQ to {po['supplier_name']} <{po['supplier_email']}>. +{po['quantity']} units of {po['inventory_name']} inbound. Est. carbon saved: {po['carbon_saved_kg']} kg.",
        "completed",
    )
    return {"ok": True, "id": po_id, "approved_at": approved_at}

# ----- Dashboard stats -----
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    inv = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    pos = await db.purchase_orders.find({}, {"_id": 0}).to_list(1000)
    low_stock = [i for i in inv if i['current_stock'] <= i['safety_threshold']]
    pending = [p for p in pos if p['status'] == "pending_review"]
    approved = [p for p in pos if p['status'] == "approved"]
    total_carbon_saved = round(sum(p.get('carbon_saved_kg', 0) for p in approved), 2)
    # cumulative timeseries
    approved_sorted = sorted(approved, key=lambda p: p.get('approved_at') or "")
    cum = 0.0
    series = []
    for p in approved_sorted:
        cum += p.get('carbon_saved_kg', 0)
        series.append({
            "timestamp": p.get('approved_at'),
            "cumulative_kg": round(cum, 2),
            "cumulative_tons": round(cum / 1000, 4),
            "supplier": p['supplier_name'],
        })
    return {
        "total_items": len(inv),
        "low_stock_count": len(low_stock),
        "pending_rfqs": len(pending),
        "approved_orders": len(approved),
        "carbon_saved_kg": total_carbon_saved,
        "carbon_saved_tons": round(total_carbon_saved / 1000, 4),
        "carbon_series": series,
    }

# ----- Seed -----
async def seed():
    # Admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "name": "Admin",
            "role": "admin",
            "password_hash": hash_password(ADMIN_PASSWORD),
            "created_at": utcnow_iso(),
        })
        logger.info(f"Seeded admin user {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing['password_hash']):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )

    # Suppliers
    if await db.suppliers.count_documents({}) == 0:
        suppliers = [
            # Steel Sheet
            {"name": "GreenSteel EU", "component_type": "Steel Sheet", "price_per_unit": 14.20, "carbon_score": 22, "lead_time_days": 9, "contact_email": "sales@greensteel.eu"},
            {"name": "Nordic Alloys", "component_type": "Steel Sheet", "price_per_unit": 12.80, "carbon_score": 41, "lead_time_days": 7, "contact_email": "orders@nordicalloys.no"},
            {"name": "TitanMet Traditional", "component_type": "Steel Sheet", "price_per_unit": 10.50, "carbon_score": 82, "lead_time_days": 5, "contact_email": "sales@titanmet.cn"},
            {"name": "AtlanticSteel", "component_type": "Steel Sheet", "price_per_unit": 13.10, "carbon_score": 58, "lead_time_days": 8, "contact_email": "contact@atlanticsteel.pt"},
            # Copper Wire
            {"name": "EcoCopper Andes", "component_type": "Copper Wire", "price_per_unit": 8.90, "carbon_score": 18, "lead_time_days": 12, "contact_email": "sales@ecocopper.cl"},
            {"name": "Volt Supplies Co.", "component_type": "Copper Wire", "price_per_unit": 7.20, "carbon_score": 55, "lead_time_days": 6, "contact_email": "orders@voltsupplies.com"},
            {"name": "BulkWire Traders", "component_type": "Copper Wire", "price_per_unit": 6.10, "carbon_score": 88, "lead_time_days": 4, "contact_email": "sales@bulkwire.in"},
            # Polymer Pellets
            {"name": "BioPoly Labs", "component_type": "Polymer Pellets", "price_per_unit": 4.75, "carbon_score": 20, "lead_time_days": 10, "contact_email": "hello@biopoly.io"},
            {"name": "PlastiCorp", "component_type": "Polymer Pellets", "price_per_unit": 3.20, "carbon_score": 68, "lead_time_days": 5, "contact_email": "sales@plasticorp.com"},
            {"name": "PetroChem Global", "component_type": "Polymer Pellets", "price_per_unit": 2.60, "carbon_score": 91, "lead_time_days": 6, "contact_email": "orders@petrochem.sa"},
            # Lithium Cells
            {"name": "SolarCell Innovations", "component_type": "Lithium Cells", "price_per_unit": 22.00, "carbon_score": 25, "lead_time_days": 14, "contact_email": "sales@solarcellinnov.de"},
            {"name": "PowerPack Mfg", "component_type": "Lithium Cells", "price_per_unit": 18.50, "carbon_score": 50, "lead_time_days": 9, "contact_email": "orders@powerpack.kr"},
            {"name": "CheapCells Ltd", "component_type": "Lithium Cells", "price_per_unit": 15.80, "carbon_score": 85, "lead_time_days": 7, "contact_email": "sales@cheapcells.com"},
        ]
        for s in suppliers:
            s['id'] = str(uuid.uuid4())
        await db.suppliers.insert_many(suppliers)
        logger.info(f"Seeded {len(suppliers)} suppliers")

    # Inventory
    if await db.inventory.count_documents({}) == 0:
        items = [
            {"item_name": "Rolled Steel Sheet 2mm", "current_stock": 220, "safety_threshold": 150, "unit": "sheets", "component_type": "Steel Sheet", "reorder_quantity": 200},
            {"item_name": "Copper Wire 2.5mm² Spool", "current_stock": 45, "safety_threshold": 60, "unit": "spools", "component_type": "Copper Wire", "reorder_quantity": 100},
            {"item_name": "PLA Polymer Pellets (25kg)", "current_stock": 300, "safety_threshold": 120, "unit": "bags", "component_type": "Polymer Pellets", "reorder_quantity": 150},
            {"item_name": "18650 Lithium-Ion Cell", "current_stock": 80, "safety_threshold": 100, "unit": "cells", "component_type": "Lithium Cells", "reorder_quantity": 250},
        ]
        for it in items:
            it['id'] = str(uuid.uuid4())
        await db.inventory.insert_many(items)
        logger.info(f"Seeded {len(items)} inventory items")

    # Initial system log
    if await db.agent_logs.count_documents({}) == 0:
        await add_log("System", "EcoSync AI initialised. Multi-agent supply chain worker is online.", "completed")

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.inventory.create_index("id", unique=True)
    await db.suppliers.create_index("id", unique=True)
    await db.agent_logs.create_index("timestamp")
    await db.purchase_orders.create_index("id", unique=True)
    await seed()
    # On boot, kick off agent loop for any items already below threshold
    async for item in db.inventory.find({}, {"_id": 0}):
        if item['current_stock'] <= item['safety_threshold']:
            # only trigger if no pending PO exists
            exists = await db.purchase_orders.find_one({"inventory_id": item['id'], "status": "pending_review"})
            if not exists:
                asyncio.create_task(run_agent_loop(item['id']))

@app.on_event("shutdown")
async def on_shutdown():
    client.close()

@api.get("/")
async def root():
    return {"service": "EcoSync AI", "status": "online"}

app.include_router(api)
