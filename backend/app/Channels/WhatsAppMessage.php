<?php

namespace App\Channels;

/**
 * Value object for WhatsApp notification messages.
 * Used by WahaChannel to structure notification content.
 */
class WhatsAppMessage
{
    /**
     * The message content (text).
     */
    public string $content;

    /**
     * Message type for categorization.
     */
    public string $type = 'notification';

    /**
     * Additional metadata to store with the message.
     */
    public array $metadata = [];

    /**
     * Create a new WhatsApp message instance.
     *
     * @param string $content
     */
    public function __construct(string $content = '')
    {
        $this->content = $content;
    }

    /**
     * Create a new message instance.
     *
     * @param string $content
     * @return static
     */
    public static function create(string $content = ''): static
    {
        return new static($content);
    }

    /**
     * Set the message content.
     *
     * @param string $content
     * @return $this
     */
    public function content(string $content): static
    {
        $this->content = $content;
        return $this;
    }

    /**
     * Set the message type.
     *
     * @param string $type
     * @return $this
     */
    public function type(string $type): static
    {
        $this->type = $type;
        return $this;
    }

    /**
     * Set the message metadata.
     *
     * @param array $metadata
     * @return $this
     */
    public function metadata(array $metadata): static
    {
        $this->metadata = $metadata;
        return $this;
    }

    /**
     * Add a line to the message content.
     *
     * @param string $line
     * @return $this
     */
    public function line(string $line): static
    {
        $this->content .= ($this->content ? "\n" : '') . $line;
        return $this;
    }

    /**
     * Add an empty line to the message content.
     *
     * @return $this
     */
    public function emptyLine(): static
    {
        $this->content .= "\n";
        return $this;
    }

    /**
     * Add a bold line to the message content.
     *
     * @param string $line
     * @return $this
     */
    public function bold(string $line): static
    {
        return $this->line("*{$line}*");
    }

    /**
     * Add an italic line to the message content.
     *
     * @param string $line
     * @return $this
     */
    public function italic(string $line): static
    {
        return $this->line("_{$line}_");
    }

    /**
     * Add a greeting line.
     *
     * @param string $name
     * @return $this
     */
    public function greeting(string $name): static
    {
        return $this->line("Bonjour {$name},");
    }

    /**
     * Add a salutation line.
     *
     * @param string $name
     * @return $this
     */
    public function salutation(string $name = 'ImmoGuinée'): static
    {
        return $this->emptyLine()->line("Cordialement,\n{$name}");
    }

    /**
     * Add a call-to-action link.
     *
     * @param string $text
     * @param string $url
     * @return $this
     */
    public function action(string $text, string $url): static
    {
        return $this->emptyLine()->line("{$text}: {$url}");
    }
}
