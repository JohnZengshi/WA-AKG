import { NextResponse, NextRequest } from "next/server";
import { waManager } from "@/modules/whatsapp/manager";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, canAccessSession } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { sessionId, content, type = "TEXT", mediaUrl, backgroundColor, font, mentions } = body; 
        
        if (!sessionId || !content) {
             return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if user can access this session
        const canAccess = await canAccessSession(user.id, user.role, sessionId);
        if (!canAccess) {
            return NextResponse.json({ error: "Forbidden - Cannot access this session" }, { status: 403 });
        }

        const instance = waManager.getInstance(sessionId);
        if (!instance?.socket) {
            return NextResponse.json({ error: "Session not ready" }, { status: 503 });
        }

        // Get database session ID for foreign key
        const dbSession = await prisma.session.findUnique({
            where: { sessionId },
            select: { id: true }
        });

        if (!dbSession) {
            return NextResponse.json({ error: "Session not found in database" }, { status: 404 });
        }

        const statusJid = 'status@broadcast';
        let additionalNodes: any[] = [];

        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
            // For status, mentions might need to be handled carefully in broadcast list if privacy is involved
            // But standard mentions:
            // options.statusJidList = mentions; // specific distribution list
        }
        
        if (type === 'TEXT') {
            const textContent: any = { 
                text: content,
                backgroundArgb: backgroundColor || 0xff000000,
                font: font || 0
            };
            if (mentions && Array.isArray(mentions) && mentions.length > 0) {
                textContent.mentions = mentions;
            }
            // Add externalAdReply if needed, but keeping it simple for now to ensure delivery
            
            await instance.socket.sendMessage(statusJid, textContent, { 
                statusJidList: mentions && Array.isArray(mentions) && mentions.length > 0 ? mentions : undefined
            });
            
        } else if (type === 'IMAGE') {
            if (!mediaUrl) return NextResponse.json({ error: "Media URL required for image status" }, { status: 400 });
            
            await instance.socket.sendMessage(statusJid, {
                image: { url: mediaUrl },
                caption: content,
                // mentions property on top level for media messages works in some versions, but better in options or context info if manually building
            }, {
                statusJidList: mentions && Array.isArray(mentions) && mentions.length > 0 ? mentions : undefined
            });

        } else if (type === 'VIDEO') {
            if (!mediaUrl) return NextResponse.json({ error: "Media URL required for video status" }, { status: 400 });
            
            await instance.socket.sendMessage(statusJid, {
                video: { url: mediaUrl },
                caption: content
            }, {
                statusJidList: mentions && Array.isArray(mentions) && mentions.length > 0 ? mentions : undefined
            });

        } else {
             return NextResponse.json({ error: "Invalid status type" }, { status: 400 });
        }
        
        // Save to DB with correct session ID
        await prisma.story.create({
            data: {
                sessionId: dbSession.id,  // Use database ID, not sessionId string
                jid: statusJid,
                content,
                mediaUrl,
                type
            }
        });

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("Post status error details:", {
            message: e.message,
            stack: e.stack,
            name: e.name,
            cause: e.cause
        });
        return NextResponse.json({ 
            error: "Failed to post status", 
            details: e.message 
        }, { status: 500 });
    }
}
