import { GraphQLError, GraphQLScalarType, Kind, ValueNode } from 'graphql';

/**
 * This is a base implementation of a date scalar, something
 * that is widely used in graphql to translate dates from strings
 * in flight to date objects in the resolvers.
 */
export const DateScalar = new GraphQLScalarType<Date, string>({
  name: 'Date',
  serialize(value: unknown) {
    try {
      if (value instanceof Date) {
        return (value as Date).toISOString();
      } else if (typeof value === 'string') {
        return new Date(value).toISOString();
      } else {
        throw new GraphQLError('Invalid type when serializing date!');
      }
    } catch {
      throw new GraphQLError('Could not serialize value to date!');
    }
  },
  parseValue(value: unknown) {
    if (typeof value === 'string') {
      try {
        const date = new Date(value as string);
        if (isNaN(date.getTime())) {
          throw new GraphQLError(`Invalid string when parsing date! ${value}`);
        }
        return date;
      } catch {
        throw new GraphQLError('Invalid type when parsing date!');
      }
    } else {
      throw new GraphQLError('Invalid type for parse date!');
    }
  },
  parseLiteral(valueNode: ValueNode) {
    if (valueNode.kind === Kind.STRING) {
      return new Date(valueNode.value);
    } else {
      throw new GraphQLError(
        `Invalid node kind when parsing date! ${valueNode.kind}`,
      );
    }
  },
});
