import type { FastifyInstance } from "fastify";
import type { TagsRepository } from "../../storage/tags-store.js";

interface TagParams {
  id: string;
}

interface TagBody {
  tag: string;
}

interface RemoveTagParams {
  id: string;
  tag: string;
}

interface ClippingsByTagParams {
  tag: string;
}

export function registerTagsRoutes(
  app: FastifyInstance,
  tagsRepo: TagsRepository,
): void {
  app.post<{ Params: TagParams; Body: TagBody }>(
    "/clippings/:id/tags",
    async (request, reply) => {
      const clippingId = Number(request.params.id);
      const { tag } = request.body;

      if (!Number.isInteger(clippingId) || typeof tag !== "string") {
        reply.code(400);
        return {
          error:
            "id must be an integer path param and body must have a string 'tag' field",
        };
      }

      tagsRepo.addTag(clippingId, tag);
      reply.code(201);
      return { clippingId, tag };
    },
  );

  app.delete<{ Params: RemoveTagParams }>(
    "/clippings/:id/tags/:tag",
    async (request, reply) => {
      const clippingId = Number(request.params.id);
      const { tag } = request.params;

      if (!Number.isInteger(clippingId)) {
        reply.code(400);
        return { error: "id must be an integer path param" };
      }

      tagsRepo.removeTag(clippingId, tag);
      reply.code(204);
      return null;
    },
  );

  app.get<{ Params: ClippingsByTagParams }>(
    "/tags/:tag/clippings",
    async (request) => {
      const { tag } = request.params;
      return { clippings: tagsRepo.listClippingsByTag(tag) };
    },
  );

  app.get<{ Params: TagParams }>(
    "/clippings/:id/tags",
    async (request, reply) => {
      const clippingId = Number(request.params.id);

      if (!Number.isInteger(clippingId)) {
        reply.code(400);
        return { error: "id must be an integer path param" };
      }

      return { tags: tagsRepo.listTagsForClipping(clippingId) };
    },
  );
}
