import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import db from '@/lib/db';

// GET /api/gallery-templates - Get all templates for authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.query(
      `SELECT
        id, template_id, template_name as name, description,
        structure, created_at, updated_at, use_count
      FROM gallery_templates
      WHERE user_id = $1
      ORDER BY created_at DESC`,
      [session.user.id]
    );

    // Transform database rows to match frontend Template interface
    const templates = result.rows.map(row => ({
      id: row.template_id,
      name: row.name,
      description: row.description,
      category: row.structure.category || 'Custom',
      folders: row.structure.folders || [],
      galleries: row.structure.galleries || [],
      createdAt: row.created_at,
      useCount: row.use_count,
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching gallery templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/gallery-templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, name, description, category, folders, galleries } = body;

    if (!templateId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId and name' },
        { status: 400 }
      );
    }

    // Store complex structure in JSONB
    const structure = {
      category: category || 'Custom',
      folders: folders || [],
      galleries: galleries || [],
    };

    const result = await db.query(
      `INSERT INTO gallery_templates
        (user_id, template_id, template_name, description, structure)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id, template_id, template_name as name, description,
        structure, created_at, use_count`,
      [
        session.user.id,
        templateId,
        name,
        description || '',
        JSON.stringify(structure)
      ]
    );

    const row = result.rows[0];
    const template = {
      id: row.template_id,
      name: row.name,
      description: row.description,
      category: row.structure.category,
      folders: row.structure.folders,
      galleries: row.structure.galleries,
      createdAt: row.created_at,
      useCount: row.use_count,
    };

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating gallery template:', error);

    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ error: 'Template ID already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// DELETE /api/gallery-templates?templateId=xxx - Delete template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateId = request.nextUrl.searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json({ error: 'Missing templateId parameter' }, { status: 400 });
    }

    // Verify ownership before deleting
    const result = await db.query(
      `DELETE FROM gallery_templates
      WHERE template_id = $1 AND user_id = $2
      RETURNING template_id`,
      [templateId, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, templateId: result.rows[0].template_id });
  } catch (error) {
    console.error('Error deleting gallery template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
