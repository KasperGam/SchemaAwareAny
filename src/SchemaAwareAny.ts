import {
  FieldDefinitionNode,
  GraphQLError,
  GraphQLNamedType,
  GraphQLScalarType,
  GraphQLSchema,
  Kind,
  NamedTypeNode,
  TypeNode,
} from 'graphql';

import { GraphQLResolverMap } from '@apollo/subgraph/dist/schema-helper/resolverMap';
import { AnyType } from '@apollo/subgraph/dist/types';

type Resolvers = GraphQLResolverMap;

export type SchemaAwareAnyScalarOptions = {
  schema: GraphQLSchema;
  resolvers: Resolvers;
};

// Don't change this name- this is the scalar name for federated "entities" resolver
const name = AnyType.name;
const description = `Scalar for subgraph entity arguments, see the Apollo documentation here https://www.apollographql.com/docs/federation/subgraph-spec/#scalar-_any`;

/**
 * Will construct a new graphql scalar to handle the _Any scalar in federated subgraphs
 * This custom handler will correctly parse custom scalar values from federated parent types
 * when the subgraph goes to resolve the entities query.
 *
 * For more info, see https://www.apollographql.com/docs/federation/subgraph-spec/#query_entities
 * @param schema The underlying subgraph schema
 */
export const buildAnyScalarResolver = ({
  schema,
  resolvers,
}: SchemaAwareAnyScalarOptions): GraphQLScalarType => {
  // Construct a new scalar based on the passed in schema
  const scalar = new GraphQLScalarType<unknown, unknown>({
    name: name,
    description: description,
    // Return the base implementation here (which returns the raw value currently)
    serialize(value: unknown) {
      return AnyType.serialize(value);
    },
    parseValue(value: unknown) {
      // First check the object is valid to parse
      if (typeof value === `object` && value !== null) {
        // GQL should always provide the type of the input value here
        const typeName = (value as { __typename?: unknown }).__typename;
        // If the value isn't there, throw an error as this breaks the expectation
        if (typeof typeName !== `string`) {
          throw new GraphQLError(
            `Could not parse out type for ${JSON.stringify(value)}, missing __typename`,
          );
        }

        // Now fetch the correct type from the schema
        const type = schema.getType(typeName);
        if (type) {
          // Map each field on that type and return the mapped object
          const mappedValue = getMappedValue(value, type, resolvers);
          return mappedValue;
        } else {
          return value;
        }
      } else {
        return value;
      }
    },
  });

  return scalar;
};

/**
 * Will map each field on the value object to
 * @param value The underlying value passed from the entity resolver (what we are resolving)
 * @param type The type node that corresponds to the actual type info for this value from the schema.
 */
const getMappedValue = (
  values: object,
  type: GraphQLNamedType,
  resolvers: Resolvers,
): Record<string, unknown> => {
  // Just casts to a record object that we can now mutate safely
  const valuesAsRecord: Record<string, unknown> = { ...values };

  // List of fields from the parent type passed in
  const fields: FieldDefinitionNode[] = [];
  const typeNode = type.astNode;

  // If we can't get the AST node, we can't scan the full type info
  // Just return here
  if (!typeNode) {
    return valuesAsRecord;
  }

  // Narrow types to those with subfields- in this case just match object types and interfaces
  // There is a third type that is possible here- input types, but those should already
  // be parsed by the default scalars and should not be passed through this scalar at all
  switch (typeNode.kind) {
    case Kind.OBJECT_TYPE_DEFINITION:
    case Kind.INTERFACE_TYPE_DEFINITION:
      fields.push(...(typeNode.fields ?? []));
      break;
  }

  // Map the values
  return Object.keys(valuesAsRecord).reduce(
    (mappedValues, key) => {
      const fieldValue = valuesAsRecord[key];
      const fieldDefinition = fields.find((field) => field.name.value === key);

      if (fieldDefinition) {
        // Go through recursively and map the value based on the type node's type
        mappedValues[key] = getRecursiveMappedType({
          node: fieldDefinition.type,
          fieldValue,
          resolvers,
        });
      } else {
        mappedValues[key] = fieldValue;
      }

      return mappedValues;
    },
    {} as Record<string, unknown>,
  );
};

const getRecursiveMappedType = ({
  node,
  fieldValue,
  resolvers,
}: {
  node: TypeNode;
  fieldValue: unknown;
  resolvers: Resolvers;
}): unknown => {
  switch (node.kind) {
    case Kind.NAMED_TYPE: {
      // Named type should be resolvable by our custom scalars
      return getNamedTypeMappedValue({
        node,
        fieldValue,
        resolvers,
        canBeNull: true,
      });
    }
    case Kind.NON_NULL_TYPE: {
      // Sub type here is either list or named type
      const subType = node.type;
      if (subType.kind === Kind.NAMED_TYPE) {
        return getNamedTypeMappedValue({
          node: subType,
          fieldValue,
          resolvers,
          canBeNull: false,
        });
      } else {
        // kind is list- Just map the values with a recursive call
        if (Array.isArray(fieldValue)) {
          return fieldValue.map((subFieldValue) =>
            getRecursiveMappedType({
              node: subType.type,
              fieldValue: subFieldValue,
              resolvers,
            }),
          );
        } else {
          // Otherwise this doesn't match! Just return field value
          return fieldValue;
        }
      }
    }
    case Kind.LIST_TYPE: {
      // Kind is list- Just map the values with a recursive call
      if (Array.isArray(fieldValue)) {
        return fieldValue.map((subFieldValue) =>
          getRecursiveMappedType({
            node: node.type,
            fieldValue: subFieldValue,
            resolvers,
          }),
        );
      } else {
        // Otherwise this doesn't match! Just return field value
        return fieldValue;
      }
    }
  }
};

/**
 *
 * @param node The NamedTypeNode in the ast tree that corresponds to the field value to parse
 * @param fieldValue The field value to parse
 * @param resolvers The list of resolvers to use for custom scalars
 * @param canBeNull If true, we return null if the field value is null. Otherwise, we throw
 * an error if the field value is null.
 * @returns The parsed field value, using the existing custom resolvers
 * (or if not found as a custom scalar, returns the field value with no parsing)
 */
const getNamedTypeMappedValue = ({
  node,
  fieldValue,
  resolvers,
  canBeNull,
}: {
  node: NamedTypeNode;
  fieldValue: unknown;
  resolvers: Resolvers;
  canBeNull: boolean;
}): unknown => {
  if (fieldValue === null) {
    if (canBeNull) {
      return fieldValue;
    } else {
      throw new GraphQLError(`Field cannot be null ${node.name.value}`);
    }
  }
  const fieldType = node.name.value;
  const customScalar = resolvers[fieldType];
  if (customScalar instanceof GraphQLScalarType) {
    const mappedValue = customScalar.parseValue(fieldValue);
    return mappedValue;
  } else {
    // TODO: If we rule out other scalars, could traverse other field types
    return fieldValue;
  }
};
